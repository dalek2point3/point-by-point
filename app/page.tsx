import { UploadForm } from "@/components/UploadForm";
import { SiteFooter } from "@/components/SiteFooter";
import fs from "node:fs/promises";
import path from "node:path";

async function readDevKey() {
  if (process.env.NODE_ENV === "production") return "";
  try {
    return (await fs.readFile(path.join(process.cwd(), "key.txt"), "utf8")).trim();
  } catch {
    return "";
  }
}

export default async function Home() {
  const initialApiKey = await readDevKey();

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Point by Point</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-5xl">Turn referee reports into a guided response letter workflow.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink/75">
            Split every editor and reviewer concern into its own workspace, draft or dictate responses, get concrete suggestions, track completeness, and publish a LaTeX response letter.
          </p>
          <div className="mt-5 max-w-xl rounded-lg border border-clay/30 bg-clay/10 p-4 text-sm leading-6 text-ink/75">
            <p className="font-semibold text-clay">Experimental public test</p>
            <p className="mt-1">
              Point by Point is an early prototype. Keep uploads small on the hosted test deployment. Response data may be lost while the prototype changes, so back up anything important.
            </p>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-ink/70">
            <p>Works with or without a revised manuscript.</p>
            <p>Uses a secret URL for collaborators.</p>
            <p>Includes the example paper workflow for testing.</p>
          </div>
          <div className="mt-6 max-w-xl rounded-lg border border-moss/20 bg-moss/10 p-4">
            <SiteFooter variant="inline" />
          </div>
          <div className="mt-8 rounded-lg border border-ink/10 bg-white p-5 text-sm leading-6 text-ink/75 shadow-sm">
            <h2 className="text-base font-semibold text-ink">AI provider key</h2>
            <p className="mt-2">
              Point by Point uses your own provider API key for parsing, suggestions, cleanup, and grading. OpenAI project keys are available from the OpenAI Platform API keys page.
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-1">
              <li>
                Open{" "}
                <a className="font-semibold text-moss underline-offset-4 hover:underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                  platform.openai.com/api-keys
                </a>
                .
              </li>
              <li>Select or create a project.</li>
              <li>Create a new secret key for that project and copy it once.</li>
            </ol>
          </div>
        </div>
        <UploadForm initialApiKey={initialApiKey} />
      </section>
    </main>
  );
}
