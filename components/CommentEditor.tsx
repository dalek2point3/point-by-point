"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReviewComment } from "@/lib/types";

type Props = {
  token: string;
  comment: ReviewComment;
  previousHref?: string;
  nextHref?: string;
  reviewHref: string;
};

export function CommentEditor({ token, comment, previousHref, nextHref, reviewHref }: Props) {
  const [draft, setDraft] = useState(comment.response);
  const [notes, setNotes] = useState(comment.notes);
  const [working, setWorking] = useState("");
  const [current, setCurrent] = useState(comment);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const wordCount = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft]);
  const encouragement = useMemo(() => {
    if (!draft.trim()) {
      return comment.difficulty >= 4
        ? "This is a high-leverage concern. A rough first pass is enough to get moving."
        : "A few concrete sentences here will move the whole letter forward.";
    }
    if (wordCount < 45) return "Good start. Add the exact change, rationale, or manuscript location next.";
    if (current.score !== null && current.score >= 80) return "This response is in strong shape. You can keep moving.";
    if (current.score !== null && current.score < 60) return "The core is here. Use the feedback to make it specific and complete.";
    return "You have momentum. Tighten the answer around what changed and why it satisfies the concern.";
  }, [comment.difficulty, current.score, draft, wordCount]);

  const save = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/projects/${token}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      setCurrent(data.comment);
    }
  }, [comment.id, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void save({ response: draft, notes, status: draft.trim() ? "drafting" : "not_started" });
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, notes, save]);

  async function action(kind: "clean" | "grade") {
    setWorking(kind);
    await save({ response: draft, notes, status: "drafting" });
    const response = await fetch(`/api/projects/${token}/comments/${comment.id}/${kind}`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setCurrent(data.comment);
      setDraft(data.comment.response);
    }
    setWorking("");
  }

  function toggleDictation() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser dictation is not available in this browser.");
      return;
    }
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");
      setDraft((existing) => `${existing.trim()} ${transcript}`.trim());
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-5">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky">{comment.sourceLabel} {comment.ordinal}{comment.originalLocator ? ` · ${comment.originalLocator}` : ""}</p>
          <h1 className="mt-2 text-2xl font-bold">{comment.title}</h1>
          <div className="mt-4 whitespace-pre-wrap rounded-md bg-paper p-4 text-sm leading-6 text-ink/80">{comment.body}</div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Your response</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toggleDictation} className="rounded-md border border-ink/20 px-3 py-2 text-sm font-semibold focus-ring">
                {listening ? "Stop dictation" : "Dictate"}
              </button>
              <button type="button" onClick={() => action("clean")} disabled={Boolean(working)} className="rounded-md border border-ink/20 px-3 py-2 text-sm font-semibold focus-ring disabled:opacity-60">
                {working === "clean" ? "Cleaning..." : "Clean up"}
              </button>
              <button type="button" onClick={() => action("grade")} disabled={Boolean(working)} className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white focus-ring disabled:opacity-60">
                {working === "grade" ? "Grading..." : "Grade"}
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="focus-ring mt-4 min-h-[280px] w-full rounded-md border border-ink/20 p-4 leading-7"
            placeholder="Draft the point-by-point response here..."
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink/60">
            <span>{wordCount} words. Autosaves as you write.</span>
            <span>{current.score === null ? "Not graded yet" : `Score: ${current.score}/100`}</span>
          </div>
          <p className="mt-3 rounded-md bg-moss/10 p-3 text-sm font-medium text-moss">{encouragement}</p>
          {current.feedback.length > 0 && (
            <div className="mt-4 rounded-md bg-clay/10 p-4 text-sm text-ink/75">
              <p className="font-semibold text-clay">Feedback</p>
              <ul className="mt-2 list-inside list-disc">
                {current.feedback.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          {previousHref ? <a className="rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring" href={previousHref}>Previous</a> : <span />}
          <div className="flex gap-2">
            <a className="rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring" href={reviewHref}>Review</a>
            {nextHref && <a className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white focus-ring" href={nextHref}>Next</a>}
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Suggested points</h2>
          <ul className="mt-3 grid gap-3 text-sm leading-6 text-ink/75">
            {comment.suggestedPoints.map((point) => (
              <li className="rounded-md bg-paper p-3" key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Concern</h2>
          <div className="mt-3 grid gap-2 text-sm text-ink/70">
            <p>Type: {comment.concernType}</p>
            <p>Difficulty: {comment.difficulty}/5</p>
            {comment.originalLocator && <p>Original: {comment.originalLocator}</p>}
            <p>Status: {current.status.replace("_", " ")}</p>
          </div>
        </div>
        <label className="grid gap-2 rounded-lg border border-ink/10 bg-white p-5 text-sm font-semibold shadow-sm">
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="focus-ring min-h-32 rounded-md border border-ink/20 p-3 font-normal" />
        </label>
      </aside>
    </div>
  );
}
