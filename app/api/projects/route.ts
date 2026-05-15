import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseComments } from "@/lib/comment-parser";
import { encryptSecret } from "@/lib/crypto";
import { extractText, inferDocumentRole } from "@/lib/extract";
import { heuristicSuggestions } from "@/lib/ai";
import { sendProjectEmail } from "@/lib/email";
import { saveProject } from "@/lib/store";
import type { AiProvider, Project, UploadedDocument } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const ownerName = String(form.get("ownerName") || "").trim();
  const ownerEmail = String(form.get("ownerEmail") || "").trim();
  const apiKey = String(form.get("apiKey") || "").trim();
  const aiProvider = normalizeProvider(String(form.get("aiProvider") || "openai"));
  const aiModel = String(form.get("aiModel") || "").trim() || undefined;
  const aiBaseUrl = String(form.get("aiBaseUrl") || "").trim() || undefined;
  const title = String(form.get("title") || "Untitled manuscript").trim();

  if (!ownerName || !ownerEmail || !apiKey) {
    return NextResponse.json({ error: "Name, email, and API key are required." }, { status: 400 });
  }

  const id = uuidv4();
  const token = uuidv4().replaceAll("-", "");
  const now = new Date().toISOString();
  const documents: UploadedDocument[] = [];

  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: "Upload at least one manuscript or report file." }, { status: 400 });
  }

  for (const file of files) {
    const role = inferDocumentRole(file.name, form.get(`role:${file.name}`)?.toString());
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(file.name, file.type, buffer);
    documents.push({
      id: uuidv4(),
      projectId: id,
      role,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      text,
      createdAt: now
    });
  }

  const reportText = documents
    .filter((document) => document.role === "reports")
    .map((document) => document.text)
    .join("\n\n");

  if (!reportText.trim()) {
    return NextResponse.json({ error: "At least one referee/editor report file is required." }, { status: 400 });
  }

  const mode = documents.some((document) => document.role === "revision") ? "revision_available" : "no_revision";
  const project: Project = {
    id,
    token,
    ownerName,
    ownerEmail,
    encryptedApiKey: encryptSecret(apiKey),
    aiProvider,
    aiModel,
    aiBaseUrl,
    mode,
    title,
    createdAt: now,
    updatedAt: now,
    documents,
    comments: []
  };

  project.comments = parseComments(id, reportText).map((comment) => ({
    ...comment,
    suggestedPoints: heuristicSuggestions(project, comment)
  }));

  await saveProject(project);
  const projectUrl = new URL(`/p/${token}`, request.url).toString();
  await sendProjectEmail(ownerEmail, ownerName, projectUrl);
  return NextResponse.json({ token, projectUrl });
}

function normalizeProvider(value: string): AiProvider {
  if (value === "anthropic") return "anthropic";
  if (value === "openai_compatible") return "openai_compatible";
  return "openai";
}
