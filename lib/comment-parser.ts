import { v4 as uuidv4 } from "uuid";
import type { CommentSource, ReviewComment } from "@/lib/types";

type Section = {
  source: CommentSource;
  sourceLabel: string;
  text: string;
};

const sourcePatterns: Array<{ pattern: RegExp; source: CommentSource; label: string }> = [
  { pattern: /Associate Editor(?:'s text comments)?/i, source: "associate_editor", label: "Associate Editor" },
  { pattern: /Reviewer:\s*1/i, source: "reviewer", label: "Reviewer 1" },
  { pattern: /Reviewer:\s*2/i, source: "reviewer", label: "Reviewer 2" },
  { pattern: /Reviewer:\s*3/i, source: "reviewer", label: "Reviewer 3" },
  { pattern: /Reviewer:\s*4/i, source: "reviewer", label: "Reviewer 4" },
  { pattern: /Reviewer:\s*5/i, source: "reviewer", label: "Reviewer 5" },
  { pattern: /DECISION:/i, source: "editor", label: "Department Editor" }
];

export function parseComments(projectId: string, reportText: string): ReviewComment[] {
  const cleaned = stripPdfChrome(reportText);
  const sections = splitSections(cleaned);
  const comments: ReviewComment[] = [];

  sections.forEach((section) => {
    const pieces = splitCommentPieces(section.text);
    pieces.forEach((piece) => {
      const concerns = splitIntoReplyWorthyConcerns(piece, section);
      concerns.forEach((concern) => {
        const body = concern.body.trim();
        if (!body || body.length < 20 || shouldSkipComment(body)) return;
        const ordinal = comments.filter((comment) => comment.sourceLabel === section.sourceLabel).length + 1;
        comments.push({
          id: uuidv4(),
          projectId,
          source: section.source,
          sourceLabel: section.sourceLabel,
          ordinal,
          originalLocator: concern.originalLocator,
          title: titleForComment(body, ordinal),
          body,
          difficulty: estimateDifficulty(body),
          concernType: inferConcernType(body),
          status: "not_started",
          suggestedPoints: [],
          response: "",
          notes: "",
          score: null,
          feedback: [],
          updatedAt: new Date().toISOString()
        });
      });
    });
  });

  return comments.length ? comments : fallbackComments(projectId, cleaned);
}

function stripPdfChrome(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^\d+ of \d+$/.test(line.trim()))
    .filter((line) => !/^https:\/\/mail\.google\.com/i.test(line.trim()))
    .filter((line) => !/Gmail - Decision on Manuscript/i.test(line.trim()))
    .filter((line) => !/^ScholarOne,/i.test(line.trim()))
    .filter((line) => !/^\d{1,2}\/\d{1,2}\/\d{2,4},/.test(line.trim()))
    .join("\n")
    .replace(/-{8,}/g, "\n\n")
    .replace(/INSTRUCTIONS FOR SUBMITTING A REVISION:[\s\S]*?(?=Associate Editor|Reviewers' text comments|Reviewer:\s*\d|$)/i, "")
    .replace(/For office use:[\s\S]*?(?=INSTRUCTIONS FOR SUBMITTING A REVISION|Associate Editor|Reviewers' text comments|Reviewer:\s*\d|$)/i, "")
    .replace(/\n{4,}/g, "\n\n\n");
}

function splitSections(text: string): Section[] {
  const matches = sourcePatterns
    .map((entry) => {
      const match = entry.pattern.exec(text);
      return match ? { ...entry, index: match.index } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => a.index - b.index);

  if (!matches.length) return [{ source: "unknown", sourceLabel: "Reports", text }];

  return matches.map((match, index) => {
    const next = matches[index + 1];
    return {
      source: match.source,
      sourceLabel: match.label,
      text: text.slice(match.index, next?.index).trim()
    };
  });
}

function splitCommentPieces(text: string) {
  const normalized = text.replace(/\n(\d{1,2})\.\s*\n/g, "\n$1. ");
  const numbered = normalized.split(/\n(?=\d{1,2}\.\s+)/g).map((piece) => piece.trim());
  if (numbered.length > 1) return numbered;

  const aePieces = normalized.split(/\n(?=\d+\s*-\s+[A-Z])/g).map((piece) => piece.trim());
  if (aePieces.length > 1) return aePieces;

  return normalized
    .split(/\n\n+/g)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 120);
}

function splitIntoReplyWorthyConcerns(piece: string, section: Section) {
  const normalized = piece
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const originalNumber = normalized.match(/^(\d{1,2})\.\s+/)?.[1];
  const withoutNumber = normalized.replace(/^\d{1,2}\.\s+/, "").trim();
  const originalLocator = originalNumber ? `${section.sourceLabel} original comment ${originalNumber}` : section.sourceLabel;

  if (withoutNumber.length < 650 || section.source === "editor") {
    return [{ body: normalized, originalLocator }];
  }

  const sentences = splitSentences(withoutNumber);
  const groups: string[][] = [];
  let current: string[] = [];

  sentences.forEach((sentence) => {
    const startsNew = current.length > 0 && shouldStartNewConcern(sentence, current.join(" "));
    if (startsNew) {
      groups.push(current);
      current = [sentence];
    } else {
      current.push(sentence);
    }
  });
  if (current.length) groups.push(current);

  const merged = mergeTinyGroups(groups);
  if (merged.length <= 1) return [{ body: normalized, originalLocator }];

  return merged.map((group, index) => ({
    body: `${group.join(" ")}`,
    originalLocator: `${originalLocator}${letterSuffix(index)}`
  }));
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+(?=(?:[A-Z]|\d|At |I |This |Related|Also|However|Moreover|In particular|On the other hand|The paper|It |Maybe|As it is))/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function shouldStartNewConcern(sentence: string, current: string) {
  const lower = sentence.toLowerCase();
  if (/^(also|related|relatedly|moreover|further|in addition|on the other hand|however|at the very least|i should note|it is also|maybe|as it is|in particular)\b/.test(lower)) return true;
  if (/^(are|is|do|does|can|could|would|why|what|how)\b/.test(lower) && current.length > 260) return true;
  if (sentence.includes("?") && current.length > 260) return true;
  if (topicShift(current, sentence) && current.length > 380) return true;
  return false;
}

function topicShift(current: string, next: string) {
  const currentType = inferConcernType(current);
  const nextType = inferConcernType(next);
  return currentType !== nextType && nextType !== "Substantive response";
}

function mergeTinyGroups(groups: string[][]) {
  const merged: string[][] = [];
  groups.forEach((group) => {
    const text = group.join(" ");
    const previous = merged[merged.length - 1];
    if (previous && text.length < 90) previous.push(...group);
    else merged.push([...group]);
  });
  return merged;
}

function letterSuffix(index: number) {
  return String.fromCharCode(97 + index);
}

function titleForComment(body: string, ordinal: number) {
  const firstLine = body
    .replace(/^\d{1,2}\.\s*/, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return `Concern ${ordinal}`;
  return firstLine.length > 92 ? `${firstLine.slice(0, 89)}...` : firstLine;
}

function estimateDifficulty(body: string) {
  const lower = body.toLowerCase();
  let score = 2;
  if (/major|mechanism|identification|estimation|data|analysis|validity|external|robustness|iv|diff-in-diff/.test(lower)) score += 2;
  if (body.length > 900) score += 1;
  if (/minor|typo|insert|delete|what does/.test(lower)) score -= 1;
  return Math.max(1, Math.min(5, score));
}

function inferConcernType(body: string) {
  const lower = body.toLowerCase();
  if (/mechanism|ownership|interpretation/.test(lower)) return "Mechanism or interpretation";
  if (/diff-in-diff|iv|regression|estimation|identification|sample/.test(lower)) return "Methods and identification";
  if (/data|figure|table|summary statistics|measure|quality/.test(lower)) return "Data, measures, or results";
  if (/literature|external validity|comparison|reference/.test(lower)) return "Positioning and literature";
  if (/typo|grammar|insert|delete|minor/.test(lower)) return "Minor correction";
  return "Substantive response";
}

function shouldSkipComment(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim().toLowerCase();
  if (/^(comments to author|reviewers' text comments|associate editor's text comments|major concerns|minor suggestions):?$/.test(normalized)) return true;
  if (normalized.includes("instructions for submitting a revision")) return true;
  if (normalized.includes("for office use")) return true;
  if (normalized.includes("manuscriptcentral.com")) return true;
  if (normalized.includes("scholarone")) return true;
  if (normalized.includes("gmail - decision on manuscript")) return true;
  return false;
}

function fallbackComments(projectId: string, text: string): ReviewComment[] {
  return [
    {
      id: uuidv4(),
      projectId,
      source: "unknown",
      sourceLabel: "Reports",
      ordinal: 1,
      originalLocator: "Reports",
      title: "Full report response",
      body: text.slice(0, 8000),
      difficulty: 3,
      concernType: "Substantive response",
      status: "not_started",
      suggestedPoints: [],
      response: "",
      notes: "",
      score: null,
      feedback: [],
      updatedAt: new Date().toISOString()
    }
  ];
}
