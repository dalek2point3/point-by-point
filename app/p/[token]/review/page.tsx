import Link from "next/link";
import { notFound } from "next/navigation";
import { MomentumHeader } from "@/components/MomentumHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { PublishPanel } from "@/components/PublishPanel";
import { getProjectByToken } from "@/lib/store";

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const project = await getProjectByToken(params.token);
  if (!project) notFound();
  const ready = project.comments.filter((comment) => comment.status === "ready").length;
  const complete = project.comments.length ? Math.round((ready / project.comments.length) * 100) : 0;
  const lowQuality = project.comments.filter((comment) => comment.score !== null && comment.score < 75);
  const incomplete = project.comments.filter((comment) => !comment.response.trim());

  return (
    <>
      <MomentumHeader project={project} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <a className="text-sm font-semibold text-moss" href={`/p/${params.token}`}>Back to dashboard</a>
          <h1 className="mt-3 text-3xl font-bold">Review and publish</h1>
          <p className="mt-2 text-sm text-ink/65">Check response quality before generating the letter.</p>
        </div>
        <div className="min-w-64">
          <div className="mb-2 flex justify-between text-sm">
            <span>Ready</span>
            <span>{complete}%</span>
          </div>
          <ProgressBar value={complete} />
        </div>
        </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Concerns" value={project.comments.length.toString()} />
        <Metric label="Incomplete" value={incomplete.length.toString()} />
        <Metric label="Low score" value={lowQuality.length.toString()} />
      </section>

      {project.mode === "no_revision" && (
        <div className="mt-6 rounded-lg border border-sky/30 bg-sky/10 p-4 text-sm text-ink/75">
          No revised manuscript was uploaded. The published letter can still be generated, but unresolved page/section placeholders should be finalized before submission.
        </div>
      )}

      <section className="mt-6 grid gap-3">
        {project.comments.map((comment) => {
          const needsAttention = !comment.response.trim() || (comment.score !== null && comment.score < 75);
          return (
            <Link key={comment.id} href={`/p/${params.token}/comment/${comment.id}`} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm hover:border-moss/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky">{comment.sourceLabel} {comment.ordinal}{comment.originalLocator ? ` · ${comment.originalLocator}` : ""}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsAttention ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>
                  {needsAttention ? "Needs attention" : "Looks ready"}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{comment.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-ink/65">{comment.response || "No response drafted yet."}</p>
              <p className="mt-2 text-sm text-ink/55">{comment.score === null ? "Ungraded" : `Score ${comment.score}/100`}</p>
            </Link>
          );
        })}
      </section>

      <div className="mt-6">
        <PublishPanel token={params.token} />
      </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
