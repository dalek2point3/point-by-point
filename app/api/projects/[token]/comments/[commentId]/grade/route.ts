import { NextResponse } from "next/server";
import { gradeResponse } from "@/lib/ai";
import { getProjectByToken, updateComment } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { token: string; commentId: string } }) {
  const project = await getProjectByToken(params.token);
  const comment = project?.comments.find((item) => item.id === params.commentId);
  if (!project || !comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  const result = await gradeResponse(project, comment, comment.response);
  const status = result.score >= 80 ? "ready" : result.score >= 50 ? "needs_work" : "drafting";
  const updated = await updateComment(params.token, params.commentId, {
    score: result.score,
    feedback: result.feedback,
    status
  });
  return NextResponse.json({ comment: updated });
}
