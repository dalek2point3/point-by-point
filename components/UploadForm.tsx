"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "done" | "error";
const maxUploadBytes = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || (process.env.NODE_ENV === "production" ? 4 : 25)) * 1024 * 1024;

export function UploadForm({ initialApiKey = "" }: { initialApiKey?: string }) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const hasRevision = useMemo(() => files.some((file) => /revision|revised|\.r1/i.test(file.name)), [files]);
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (totalSize > maxUploadBytes) {
      setState("error");
      setMessage(`This upload is ${formatBytes(totalSize)}. The public test deployment currently supports uploads up to ${formatBytes(maxUploadBytes)}. Try the referee reports plus a smaller manuscript PDF, or omit the large revision PDF for now.`);
      return;
    }
    setState("uploading");
    setMessage("");
    const form = new FormData(event.currentTarget);
    files.forEach((file) => form.append("files", file));

    const response = await fetch("/api/projects", { method: "POST", body: form });
    const data = await readResponse(response);
    if (!response.ok) {
      setState("error");
      setMessage(data.error || data.message || "Project creation failed.");
      return;
    }
    await waitForProject(data.token);
    setState("done");
    setUrl(data.projectUrl);
    router.push(`/p/${data.token}`);
  }

  async function readResponse(response: Response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { message: text || response.statusText };
    }
  }

  async function waitForProject(token: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await fetch(`/api/projects/${token}`, { cache: "no-store" });
      if (response.ok) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-moss/30 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Workspace ready</h2>
        <p className="mt-2 text-sm text-ink/70">The project URL was emailed when email is configured. Anyone with this link can collaborate.</p>
        <a className="mt-5 inline-flex rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white focus-ring" href={url}>
          Open project
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Your name
          <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="ownerName" required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="ownerEmail" type="email" required />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Manuscript title
        <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="title" placeholder="Response to reviewers" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        AI provider
        <select className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="aiProvider" defaultValue="openai">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic / Claude</option>
          <option value="openai_compatible">OpenAI-compatible endpoint</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        API key
        <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="apiKey" type="password" defaultValue={initialApiKey} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Model override
          <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="aiModel" placeholder="Optional" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Compatible base URL
          <input className="focus-ring rounded-md border border-ink/20 px-3 py-2" name="aiBaseUrl" placeholder="Only for compatible endpoints" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Upload original paper, optional revision, referee/editor reports, and optional notes
        <input
          className="focus-ring rounded-md border border-dashed border-ink/30 bg-paper px-3 py-5"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.tex"
          onChange={(event) => setFiles(Array.from(event.target.files || []))}
          required
        />
      </label>
      {files.length > 0 && (
        <div className="rounded-md bg-paper p-3 text-sm text-ink/75">
          <p>{files.length} file(s) selected, {formatBytes(totalSize)} total. {hasRevision ? "Revision detected." : "No revision detected; the app will use planning mode."}</p>
          {totalSize > maxUploadBytes && (
            <p className="mt-2 font-medium text-clay">
              This is larger than the configured upload limit. Keep uploads small for the current prototype.
            </p>
          )}
          <ul className="mt-2 list-inside list-disc">
            {files.map((file) => (
              <li key={file.name}>{file.name} ({formatBytes(file.size)})</li>
            ))}
          </ul>
        </div>
      )}
      {message && <p className="rounded-md bg-clay/10 p-3 text-sm text-clay">{message}</p>}
      <button disabled={state === "uploading"} className="focus-ring rounded-md bg-moss px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {state === "uploading" ? "Creating workspace..." : "Create workspace"}
      </button>
    </form>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
