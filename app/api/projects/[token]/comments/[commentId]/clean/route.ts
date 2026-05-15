import { NextResponse } from "next/server";
import { cleanResponse } from "@/lib/ai";
import { getProjectByToken, updateComment } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { token: string; commentId: string } }) {
  const project = await getProjectByToken(params.token);
  const comment = project?.comments.find((item) => item.id === params.commentId);
  if (!project || !comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  const cleaned = await cleanResponse(project, comment, comment.response);
  const updated = await updateComment(params.token, params.commentId, { response: cleaned, status: "drafting" });
  return NextResponse.json({ comment: updated });
}
