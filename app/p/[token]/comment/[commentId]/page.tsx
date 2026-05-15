import { notFound } from "next/navigation";
import { ClientCommentEditor } from "@/components/ClientCommentEditor";
import { MomentumHeader } from "@/components/MomentumHeader";
import { getProjectByToken } from "@/lib/store";

export default async function CommentPage({ params }: { params: { token: string; commentId: string } }) {
  const project = await getProjectByToken(params.token);
  if (!project) notFound();
  const index = project.comments.findIndex((comment) => comment.id === params.commentId);
  if (index === -1) notFound();
  const comment = project.comments[index];
  const previous = project.comments[index - 1];
  const next = project.comments[index + 1];

  return (
    <>
      <MomentumHeader project={project} currentIndex={index} />
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <a className="text-sm font-semibold text-moss" href={`/p/${params.token}`}>Back to dashboard</a>
        <div className="flex items-center gap-2">
          {previous ? (
            <a className="rounded-md border border-ink/20 px-3 py-2 text-sm font-semibold focus-ring" href={`/p/${params.token}/comment/${previous.id}`}>
              Previous
            </a>
          ) : (
            <span className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/35">Previous</span>
          )}
          <span className="px-2 text-sm text-ink/60">{index + 1} of {project.comments.length}</span>
          {next ? (
            <a className="rounded-md border border-ink/20 px-3 py-2 text-sm font-semibold focus-ring" href={`/p/${params.token}/comment/${next.id}`}>
              Next
            </a>
          ) : (
            <span className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/35">Next</span>
          )}
        </div>
        </div>
        <ClientCommentEditor
        token={params.token}
        comment={comment}
        previousHref={previous ? `/p/${params.token}/comment/${previous.id}` : undefined}
        nextHref={next ? `/p/${params.token}/comment/${next.id}` : undefined}
        reviewHref={`/p/${params.token}/review`}
        />
      </main>
    </>
  );
}
