import Link from "next/link";
import { notFound } from "next/navigation";
import { MomentumHeader } from "@/components/MomentumHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { getProjectByToken } from "@/lib/store";

export default async function ProjectPage({ params }: { params: { token: string } }) {
  const project = await getProjectByToken(params.token);
  if (!project) notFound();
  const complete = project.comments.length ? Math.round((project.comments.filter((comment) => comment.status === "ready").length / project.comments.length) * 100) : 0;
  const next = project.comments.find((comment) => comment.status !== "ready") || project.comments[0];

  return (
    <>
      <MomentumHeader project={project} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <header className="flex flex-col gap-5 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">{project.mode === "revision_available" ? "Revision available" : "No revision yet"}</p>
          <h1 className="mt-2 text-3xl font-bold">{project.title}</h1>
          <p className="mt-2 text-sm text-ink/65">{project.comments.length} extracted concerns. Keep going one response at a time.</p>
        </div>
        <div className="flex gap-3">
          {next && (
            <Link className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white focus-ring" href={`/p/${params.token}/comment/${next.id}`}>
              Continue
            </Link>
          )}
          <Link className="rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring" href={`/p/${params.token}/review`}>
            Review
          </Link>
        </div>
        </header>

      <section className="mt-6 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Completeness</span>
          <span>{complete}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={complete} />
        </div>
        <p className="mt-3 text-sm text-ink/65">{complete >= 80 ? "The letter is taking shape." : "Small, specific answers add up quickly."}</p>
      </section>

      <section className="mt-6 grid gap-3">
        {project.comments.map((comment) => (
          <Link
            key={comment.id}
            href={`/p/${params.token}/comment/${comment.id}`}
            className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm transition hover:border-moss/50 md:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky">{comment.sourceLabel} {comment.ordinal}{comment.originalLocator ? ` · ${comment.originalLocator}` : ""}</p>
              <h2 className="mt-1 font-semibold">{comment.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-ink/65">{comment.body}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-paper px-3 py-1">Difficulty {comment.difficulty}/5</span>
              <span className="rounded-full bg-paper px-3 py-1">{comment.score === null ? "Ungraded" : `${comment.score}/100`}</span>
              <span className="rounded-full bg-moss/10 px-3 py-1 text-moss">{comment.status.replace("_", " ")}</span>
            </div>
          </Link>
        ))}
      </section>
      </main>
    </>
  );
}
