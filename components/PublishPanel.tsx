"use client";

import { useState } from "react";

export function PublishPanel({ token }: { token: string }) {
  const [tex, setTex] = useState("");
  const [style, setStyle] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);

  async function publish() {
    setWorking(true);
    const response = await fetch(`/api/projects/${token}/publish`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setTex(data.tex);
      setStyle(data.style || "");
      setPdfUrl(`data:application/pdf;base64,${data.pdfBase64}`);
      setStatus(data.pdfStatus);
    } else {
      setStatus(data.error || "Publish failed.");
    }
    setWorking(false);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Publish</h2>
          <p className="mt-1 text-sm text-ink/65">Generate the final LaTeX response letter from the current responses.</p>
        </div>
        <button onClick={publish} disabled={working} className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white focus-ring disabled:opacity-60">
          {working ? "Publishing..." : "Publish LaTeX"}
        </button>
      </div>
      {status && <p className="mt-4 rounded-md bg-paper p-3 text-sm text-ink/70">{status}</p>}
      {(tex || style || pdfUrl) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tex && (
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(tex)}`} download="response-letter.tex" className="inline-flex rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring">
              Download LaTeX
            </a>
          )}
          {style && (
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(style)}`} download="pbyp.sty" className="inline-flex rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring">
              Download style file
            </a>
          )}
          {pdfUrl && (
            <a href={pdfUrl} download="response-letter.pdf" className="inline-flex rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold focus-ring">
              Download PDF
            </a>
          )}
        </div>
      )}
      {tex && (
        <textarea
          readOnly
          value={tex}
          className="focus-ring mt-4 h-[420px] w-full rounded-md border border-ink/20 p-4 font-mono text-xs leading-5"
        />
      )}
    </section>
  );
}
