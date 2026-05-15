# Point by Point

Local-first web app for drafting revise-and-resubmit response letters. It splits editor/referee reports into reply-worthy concerns, supports drafting or browser dictation, suggests response points, grades completeness, and exports a LaTeX response letter.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

No hosted services are required. Local projects are saved in:

```text
.data/projects.json
```

## Provider Keys

Each user supplies their own API key in the app. Supported options:

- OpenAI
- Anthropic / Claude
- OpenAI-compatible endpoints with a custom base URL

Optional local convenience: create a `key.txt` file in the repo root and the local app will prefill the key field. `key.txt` is ignored by Git.

## Privacy Notes

- Do not commit API keys, manuscript PDFs, referee letters, or local project data.
- `.gitignore` excludes `key.txt`, `.data/`, common document formats, and PDFs.
- In local mode, uploaded files and responses stay on your machine, except text sent to the AI provider you choose using your own key.
- Back up important responses manually. This is an early prototype.

## Upload Sizes

Local mode defaults to a 25 MB upload limit. Keep uploads small while this is an early prototype.

Set a custom limit:

```text
NEXT_PUBLIC_MAX_UPLOAD_MB=25
```

## Reset Local Data

```bash
rm -rf .data
```

## GitHub Safety

This repository is intended for local use. Do not commit personal manuscript files, API keys, or generated `.data` projects.
