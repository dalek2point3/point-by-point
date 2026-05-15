import { NextResponse } from "next/server";
import { getProjectByToken, summarizeProject } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const project = await getProjectByToken(params.token);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({
    project: {
      ...summarizeProject(project),
      documents: project.documents.map((document) => ({
        id: document.id,
        role: document.role,
        fileName: document.fileName,
        createdAt: document.createdAt
      })),
      comments: project.comments
    }
  });
}
