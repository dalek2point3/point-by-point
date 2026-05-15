import { ProgressBar } from "@/components/ProgressBar";
import type { Project } from "@/lib/types";

type Props = {
  project: Project;
  currentIndex?: number;
};

export function MomentumHeader({ project, currentIndex }: Props) {
  const total = project.comments.length;
  const drafted = project.comments.filter((comment) => comment.response.trim()).length;
  const ready = project.comments.filter((comment) => comment.status === "ready").length;
  const progress = total ? Math.round(((drafted * 0.55 + ready * 0.45) / total) * 100) : 0;
  const affirmation = affirmationFor(progress, drafted, total);

  return (
    <section className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 px-5 py-3 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[1fr_360px] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-ink">Overall progress</span>
            <span className="text-sm text-ink/60">
              {drafted}/{total} drafted · {ready}/{total} ready{currentIndex !== undefined ? ` · concern ${currentIndex + 1}/${total}` : ""}
            </span>
          </div>
          <div className="mt-1 text-sm text-moss">{affirmation}</div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold text-ink/65">
            <span>Response letter momentum</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>
    </section>
  );
}

function affirmationFor(progress: number, drafted: number, total: number) {
  if (total === 0) return "Upload reports to begin turning the revision into a sequence of small wins.";
  if (progress === 0) return "Start with one concrete answer; the rest becomes easier once the first response exists.";
  if (progress < 25) return "Good start. You are converting a messy report into manageable, reply-worthy pieces.";
  if (progress < 50) return "Momentum is building. Keep each response specific and the letter will assemble itself.";
  if (progress < 75) return "Past the hard middle. Now the remaining concerns are easier to see and finish.";
  if (progress < 100) return "Close to a complete response letter. Tighten the low-scoring items and publish.";
  return drafted === total ? "Complete draft ready. This is in review-and-polish territory now." : "The structure is ready; fill the remaining blanks.";
}
