import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function compileLatexPdf(tex: string, style: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "point-by-point-"));
  const texPath = path.join(dir, "response-letter.tex");
  const stylePath = path.join(dir, "pbyp.sty");
  const pdfPath = path.join(dir, "response-letter.pdf");

  try {
    await fs.writeFile(texPath, tex);
    await fs.writeFile(stylePath, style);
    await runPdflatex(dir);
    await runPdflatex(dir);
    return await fs.readFile(pdfPath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function runPdflatex(cwd: string) {
  await execFileAsync(
    "pdflatex",
    ["-interaction=nonstopmode", "-halt-on-error", "response-letter.tex"],
    { cwd, timeout: 30000, maxBuffer: 1024 * 1024 * 8 }
  );
}
