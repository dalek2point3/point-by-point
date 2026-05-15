import type { Project } from "@/lib/types";

export async function buildPdf(project: Project) {
  const lines: string[] = [];
  lines.push("Response to Reviewers");
  lines.push(project.title);
  lines.push(project.ownerName);
  lines.push("");
  lines.push("We would like to thank the editor, associate editor, and reviewers for their careful reading of our manuscript.");
  lines.push("Please find our point-by-point response below.");
  lines.push("");
  lines.push("Summary of Major Changes");

  const summaryResponses = project.comments.filter((comment) => comment.response.trim()).slice(0, 8);
  if (summaryResponses.length) {
    summaryResponses.forEach((comment) => lines.push(`- ${firstSentence(comment.response)}`));
  } else {
    lines.push("- Summary pending.");
  }

  if (project.mode === "no_revision") {
    lines.push("");
    lines.push("Note: This response letter was prepared before a revised manuscript was uploaded.");
    lines.push("Finalize manuscript location placeholders before submission.");
  }

  const grouped = new Map<string, typeof project.comments>();
  project.comments.forEach((comment) => {
    grouped.set(comment.sourceLabel, [...(grouped.get(comment.sourceLabel) || []), comment]);
  });

  Array.from(grouped.entries()).forEach(([label, comments]) => {
    lines.push("");
    lines.push(sectionTitle(label));
    comments.forEach((comment) => {
      lines.push("");
      lines.push(`${label} Q${comment.ordinal}${comment.originalLocator ? ` (${comment.originalLocator})` : ""}`);
      lines.push(`[Original referee/editor comment]`);
      lines.push(comment.body);
      lines.push(`Response: ${comment.response.trim() || "[Response pending.]"}`);
    });
  });

  return createSimplePdf(lines);
}

function createSimplePdf(lines: string[]) {
  const pages = paginate(lines.flatMap((line) => wrapLine(line, 92)), 46);
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const pagesIdPlaceholder = 0;

  pages.forEach((page) => {
    const stream = pageToStream(page);
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}\nendstream`);
    contentIds.push(contentId);
    const pageId = add(`<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  pageIds.forEach((pageId) => {
    objects[pageId - 1] = objects[pageId - 1].replace(`${pagesIdPlaceholder} 0 R`, `${pagesId} 0 R`);
  });
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}

function paginate(lines: string[], pageSize: number) {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }
  return pages.length ? pages : [["Response to Reviewers"]];
}

function pageToStream(lines: string[]) {
  const escaped = lines.map((line, index) => {
    const y = 740 - index * 15;
    return `BT /F1 10 Tf 54 ${y} Td (${escapePdf(line)}) Tj ET`;
  });
  return escaped.join("\n");
}

function wrapLine(line: string, width: number) {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (!cleaned) return [""];
  const chunks: string[] = [];
  let current = "";
  cleaned.split(" ").forEach((word) => {
    if ((current + " " + word).trim().length > width) {
      chunks.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function escapePdf(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function firstSentence(response: string) {
  const sentence = response.trim().split(/(?<=[.!?])\s+/)[0] || response.trim();
  return sentence.length > 180 ? `${sentence.slice(0, 177)}...` : sentence;
}

function sectionTitle(label: string) {
  if (/department editor|editor/i.test(label) && !/associate/i.test(label)) return "Editor Comments";
  if (/associate editor/i.test(label)) return "Associate Editor Comments";
  return `${label} Comments`;
}
