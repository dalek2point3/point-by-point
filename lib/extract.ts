import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import type { DocumentRole } from "@/lib/types";

export function inferDocumentRole(fileName: string, explicitRole?: string | null): DocumentRole {
  if (explicitRole && ["original", "revision", "reports", "notes", "other"].includes(explicitRole)) {
    return explicitRole as DocumentRole;
  }
  const lower = fileName.toLowerCase();
  if (lower.includes("revision") || lower.includes("revised") || lower.includes(".r1")) return "revision";
  if (lower.includes("report") || lower.includes("referee") || lower.includes("reviewer") || lower.includes("decision")) return "reports";
  if (lower.includes("note")) return "notes";
  if (lower.includes("original") || lower.includes("draft") || lower.includes("paper")) return "original";
  return "other";
}

export async function extractText(fileName: string, mimeType: string, buffer: Buffer) {
  const lower = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return cleanupExtractedText(result.text);
  }
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanupExtractedText(result.value);
  }
  return cleanupExtractedText(buffer.toString("utf8"));
}

export function cleanupExtractedText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function compactForPrompt(text: string, maxChars = 16000) {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.55));
  const tail = text.slice(text.length - Math.floor(maxChars * 0.35));
  return `${head}\n\n[...middle omitted for prompt length...]\n\n${tail}`;
}
