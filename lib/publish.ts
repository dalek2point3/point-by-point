import fs from "node:fs";
import path from "node:path";
import type { Project, ReviewComment } from "@/lib/types";

const beginMarker = "\\begin{document}";
const endMarker = "\\end{document}";

export function buildLatex(project: Project) {
  const template = readTemplate();
  const beforeDocument = template.slice(0, template.indexOf(beginMarker) + beginMarker.length);
  const afterDocument = template.slice(template.indexOf(endMarker));
  const body = buildBody(project);
  return `${beforeDocument}\n\n${body}\n\n${afterDocument}`;
}

export function readPbypStyle() {
  return fs.readFileSync(path.join(process.cwd(), "pbyp.sty"), "utf8");
}

function readTemplate() {
  const template = fs.readFileSync(path.join(process.cwd(), "template.tex"), "utf8");
  if (!template.includes(beginMarker) || !template.includes(endMarker)) {
    throw new Error("template.tex must include \\begin{document} and \\end{document}");
  }
  return template;
}

function buildBody(project: Project) {
  const grouped = groupComments(project.comments);
  const summaryItems = project.comments
    .filter((comment) => comment.response.trim())
    .slice(0, 10)
    .map((comment) => `\\item ${escapeLatex(summaryLine(comment.response))}`)
    .join("\n");
  const sections = Array.from(grouped.entries())
    .map(([label, comments]) => buildSection(label, comments))
    .join("\n\n");

  return `\\begin{center}
\\Large\\bfseries Point by Point: Response to Reviewers\\\\[0.35em]
\\large ${escapeLatex(project.title)}\\\\[0.25em]
\\normalsize ${escapeLatex(project.ownerName)}
\\end{center}

We would like to thank the editor, associate editor, and reviewers for their careful reading of our manuscript. Please find our point-by-point response below.

${project.mode === "no_revision" ? "\\textbf{Note.} This response letter was prepared before a revised manuscript was uploaded. Please finalize manuscript-location placeholders before submission.\n\n" : ""}
\\section*{Summary of Major Changes}
\\begin{itemize}
${summaryItems || "\\item Summary pending."}
\\end{itemize}

${sections}`;
}

function buildSection(label: string, comments: ReviewComment[]) {
  const entries = comments.map((comment, index) => buildEntry(label, comment, index + 1)).join("\n\n");
  return `\\section*{${escapeLatex(sectionTitle(label))}}\n${entries}`;
}

function buildEntry(label: string, comment: ReviewComment, index: number) {
  const questionId = questionIdFor(label, index);
  const labelId = latexLabelFor(label, index);
  const response = comment.response.trim() || "[Response pending.]";
  const locator = comment.originalLocator ? `\n\n\\emph{Original location: ${escapeLatex(comment.originalLocator)}}` : "";

  return `% ${escapeLatex(label)} concern ${index}
\\begin{question}{${questionId}}\\label{${labelId}}
${escapeLatex(comment.body)}${locator}
\\end{question}

\\begin{response}
${escapeLatex(response)}
\\end{response}`;
}

function groupComments(comments: ReviewComment[]) {
  const grouped = new Map<string, ReviewComment[]>();
  comments.forEach((comment) => {
    grouped.set(comment.sourceLabel, [...(grouped.get(comment.sourceLabel) || []), comment]);
  });
  return grouped;
}

function sectionTitle(label: string) {
  if (/department editor|editor/i.test(label) && !/associate/i.test(label)) return "Editor Comments";
  if (/associate editor/i.test(label)) return "Associate Editor Comments";
  return `${label} Comments`;
}

function questionIdFor(label: string, index: number) {
  const q = `Q${index}`;
  if (/associate editor/i.test(label)) return `\\QuestionRevAE{${q}}`;
  if (/department editor|editor/i.test(label)) return `\\QuestionRevAE{Editor ${q}}`;
  const reviewer = reviewerNumber(label);
  const macros = ["", "\\QuestionRevA", "\\QuestionRevB", "\\QuestionRevC", "\\QuestionRevD", "\\QuestionRevE", "\\QuestionRevF"];
  return reviewer && reviewer <= 6 ? `${macros[reviewer]}{${q}}` : `${escapeLatex(label)}: ${q}`;
}

function latexLabelFor(label: string, index: number) {
  if (/associate editor/i.test(label)) return `AE:Q${index}`;
  if (/department editor|editor/i.test(label)) return `Editor:Q${index}`;
  const reviewer = reviewerNumber(label);
  return reviewer ? `R${reviewer}:Q${index}` : `Comment:Q${index}`;
}

function reviewerNumber(label: string) {
  const match = label.match(/Reviewer\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function summaryLine(response: string) {
  const firstSentence = response.split(/(?<=[.!?])\s+/)[0] || response;
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}...` : firstSentence;
}

function escapeLatex(value: string) {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
