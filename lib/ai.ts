import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { decryptSecret } from "@/lib/crypto";
import { compactForPrompt } from "@/lib/extract";
import type { Project, ReviewComment } from "@/lib/types";

const advice = `Begin directly and professionally. Respond to every substantive point. Quote or paraphrase the referee comment, then explain what changed. Give page, section, table, or paragraph locations when possible. Minor typos can be grouped. If disagreeing, be respectful and explain why the requested change would not improve the paper. Save the editor's time.`;

export async function generateSuggestedPoints(project: Project, comment: ReviewComment) {
  if (!hasApiKey(project)) return heuristicSuggestions(project, comment);
  try {
    const original = project.documents.find((doc) => doc.role === "original")?.text || "";
    const revision = project.documents.find((doc) => doc.role === "revision")?.text || "";
    const notes = project.documents.filter((doc) => doc.role === "notes").map((doc) => doc.text).join("\n\n");
    const prompt = `You are helping draft a journal response letter.

Advice:
${advice}

Project mode: ${project.mode}

Reviewer/editor comment:
${comment.body}

Author notes:
${compactForPrompt(notes, 4000)}

Original manuscript excerpt:
${compactForPrompt(original, 7000)}

Revised manuscript excerpt:
${revision ? compactForPrompt(revision, 7000) : "[No revised manuscript was uploaded yet.]"}

Return 4-6 concrete bullet points the author can use in a response. If there is no revision, suggest planned edits and mark location placeholders.`;
    return parseBullets(await completeText(project, prompt, 0.3));
  } catch {
    return heuristicSuggestions(project, comment);
  }
}

export async function cleanResponse(project: Project, comment: ReviewComment, draft: string) {
  if (!hasApiKey(project)) return polishHeuristically(draft);
  try {
    return await completeText(
      project,
      `Clean this dictated draft into a concise, respectful referee response. Preserve substance and do not invent page numbers.

Comment:
${comment.body}

Draft response:
${draft}`,
      0.2
    );
  } catch {
    return polishHeuristically(draft);
  }
}

export async function gradeResponse(project: Project, comment: ReviewComment, response: string) {
  if (!hasApiKey(project)) return heuristicGrade(project, comment, response);
  try {
    const text = await completeText(
      project,
      `Grade this response letter answer from 0-100. Return JSON only: {"score":number,"feedback":["..."]}.

Advice:
${advice}

Project mode: ${project.mode}
Comment:
${comment.body}

Response:
${response}`,
      0.1,
      true
    );
    const parsed = JSON.parse(extractJson(text)) as { score?: number; feedback?: string[] };
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score || 0))),
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 5) : []
    };
  } catch {
    return heuristicGrade(project, comment, response);
  }
}

async function completeText(project: Project, prompt: string, temperature: number, json = false) {
  const provider = project.aiProvider || "openai";
  const apiKey = decryptSecret(project.encryptedApiKey);

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const result = await anthropic.messages.create({
      model: project.aiModel || process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: json ? 800 : 1400,
      temperature,
      messages: [{ role: "user", content: prompt }]
    });
    return result.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();
  }

  const openai = new OpenAI({
    apiKey,
    ...(provider === "openai_compatible" && project.aiBaseUrl ? { baseURL: project.aiBaseUrl } : {})
  });
  const result = await openai.chat.completions.create({
    model: project.aiModel || process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature,
    ...(json ? { response_format: { type: "json_object" as const } } : {})
  });
  return result.choices[0]?.message.content?.trim() || "";
}

function hasApiKey(project: Project) {
  try {
    return decryptSecret(project.encryptedApiKey).trim().length > 8;
  } catch {
    return false;
  }
}

export function heuristicSuggestions(project: Project, comment: ReviewComment) {
  const noRevision = project.mode === "no_revision";
  const points = [
    "Start by thanking the reviewer for the specific concern and state the main action taken.",
    noRevision
      ? "Describe the planned manuscript change and leave a clear placeholder for page/section details."
      : "Name the manuscript section, table, figure, or appendix where the revision appears.",
    "Explain how the change addresses the concern rather than only saying it was fixed.",
    "Keep the tone concise and respectful, especially if you are only partially adopting the suggestion."
  ];
  if (comment.difficulty >= 4) points.push("For this high-difficulty concern, add evidence, robustness checks, or a careful rationale.");
  if (comment.concernType.includes("Minor")) points.push("Group purely minor edits when appropriate instead of over-explaining.");
  return points;
}

function heuristicGrade(project: Project, comment: ReviewComment, response: string) {
  const lower = response.toLowerCase();
  let score = 20;
  const feedback: string[] = [];
  if (response.trim().length > 80) score += 20;
  else feedback.push("The response is too short to reassure an editor.");
  if (/thank|appreciat|agree|helpful/.test(lower)) score += 10;
  else feedback.push("Open with a professional acknowledgement of the concern.");
  if (/revis|add|clarif|include|report|show|appendix|section|table|figure/.test(lower)) score += 20;
  else feedback.push("State the concrete manuscript change or planned change.");
  if (/page|section|appendix|table|figure|paragraph|p\./.test(lower)) score += 15;
  else feedback.push(project.mode === "no_revision" ? "Add a placeholder for where this will appear in the manuscript." : "Cite where the change appears.");
  if (comment.difficulty >= 4 && !/because|therefore|robust|evidence|analysis|data/.test(lower)) feedback.push("This difficult concern needs more reasoning or evidence.");
  if (/done|fixed|addressed/.test(lower) && response.length < 180) feedback.push("Avoid relying on generic fixed/done language without detail.");
  score = Math.min(100, score - feedback.length * 5);
  return { score: Math.max(0, score), feedback: feedback.slice(0, 5) };
}

function parseBullets(text: string) {
  const bullets = text
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 8);
  return bullets.length ? bullets.slice(0, 6) : [text.trim()].filter(Boolean);
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function polishHeuristically(draft: string) {
  const trimmed = draft.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I")
    .replace(/^./, (match) => match.toUpperCase());
}
