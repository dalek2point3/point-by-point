import fs from "node:fs/promises";
import path from "node:path";
import type { Project, ProjectSummary, ReviewComment } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "projects.json");

type Database = {
  projects: Project[];
};

let writeQueue = Promise.resolve();

export async function saveProject(project: Project) {
  await enqueueWrite(async () => {
    const db = await readDb();
    const index = db.projects.findIndex((item) => item.id === project.id);
    if (index === -1) db.projects.push(project);
    else db.projects[index] = project;
    await writeDb(db);
  });
}

export async function getProjectByToken(token: string) {
  const db = await readDb();
  return db.projects.find((project) => project.token === token) || null;
}

export async function getProjectById(id: string) {
  const db = await readDb();
  return db.projects.find((project) => project.id === id) || null;
}

export async function updateComment(token: string, commentId: string, patch: Partial<ReviewComment>) {
  const project = await getProjectByToken(token);
  if (!project) return null;
  project.comments = project.comments.map((comment) => {
    if (comment.id !== commentId) return comment;
    return { ...comment, ...patch, updatedAt: new Date().toISOString() };
  });
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
  return project.comments.find((comment) => comment.id === commentId) || null;
}

export function summarizeProject(project: Project): ProjectSummary {
  const readyCount = project.comments.filter((comment) => comment.status === "ready").length;
  const scores = project.comments
    .map((comment) => comment.score)
    .filter((score): score is number => typeof score === "number");
  return {
    id: project.id,
    token: project.token,
    ownerName: project.ownerName,
    ownerEmail: project.ownerEmail,
    mode: project.mode,
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    commentCount: project.comments.length,
    readyCount,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null
  };
}

async function readDb(): Promise<Database> {
  try {
    const raw = (await fs.readFile(dataFile, "utf8")).replace(/\0/g, "");
    const parsed = JSON.parse(raw) as Database;
    return { projects: Array.isArray(parsed.projects) ? parsed.projects : [] };
  } catch {
    return { projects: [] };
  }
}

async function writeDb(db: Database) {
  await fs.mkdir(dataDir, { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2));
  await fs.rename(tempFile, dataFile);
}

async function enqueueWrite(task: () => Promise<void>) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  await next;
}
