import { NextResponse } from "next/server";
import { compileLatexPdf } from "@/lib/latex-compile";
import { buildPdf } from "@/lib/pdf";
import { buildLatex, readPbypStyle } from "@/lib/publish";
import { getProjectByToken, saveProject } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  const project = await getProjectByToken(params.token);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const tex = buildLatex(project);
  const style = readPbypStyle();
  let pdfStatus = "Styled PDF and template LaTeX generated.";
  let pdf: Buffer;
  try {
    pdf = await compileLatexPdf(tex, style);
  } catch {
    pdf = await buildPdf(project);
    pdfStatus = "Template LaTeX generated. Styled PDF compilation is unavailable on this server, so the PDF download is a plain preview.";
  }
  project.publishedTex = tex;
  project.publishedPdfUrl = `data:application/pdf;base64,${pdf.toString("base64")}`;
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
  return NextResponse.json({
    tex,
    style,
    pdfBase64: pdf.toString("base64"),
    pdfStatus
  });
}
