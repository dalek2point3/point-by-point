import { NextResponse } from "next/server";
import { updateComment } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { token: string; commentId: string } }) {
  const body = await request.json();
  const response = typeof body.response === "string" ? body.response : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  const status = body.status;
  const updated = await updateComment(params.token, params.commentId, {
    ...(response !== undefined ? { response } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(status ? { status } : {})
  });
  if (!updated) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  return NextResponse.json({ comment: updated });
}
