import fs from "fs/promises";
import path from "path";
import { authenticate } from "@google-cloud/local-auth";
import { google, tasks_v1 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/tasks"];
const TOKEN_DIR = path.join(process.env.HOME || "~", ".config/google-personal");
const TOKEN_PATH = path.join(TOKEN_DIR, "token.json");
const GOOGLE_CREDENTIALS_PATH: string = process.env.GOOGLE_CREDENTIALS_PATH ?? "";
if (!GOOGLE_CREDENTIALS_PATH) {
  throw new Error("GOOGLE_CREDENTIALS_PATH is not set");
}

// Cached client
let tasks: tasks_v1.Tasks | null = null;

export async function getTasksClient(): Promise<tasks_v1.Tasks> {
  if (tasks) return tasks;

  // Read or request new credentials
  await fs.mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  const auth = await authorize();
  tasks = google.tasks({ version: "v1", auth });
  return tasks;
}

async function authorize() {
  // 1. try existing token
  try {
    const rawToken = await fs.readFile(TOKEN_PATH, "utf8");
    const creds = JSON.parse(rawToken);
    const auth = new google.auth.OAuth2();
    auth.setCredentials(creds);
    return auth;
  } catch {}

  // 2. interactive installed‑app flow (opens browser)
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: GOOGLE_CREDENTIALS_PATH,
  });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(auth.credentials), { mode: 0o600 });
  return auth;
}

// ───────── Convenience wrappers ─────────
export async function listTaskLists() {
  const c = await getTasksClient();
  const res = await c.tasklists.list({ maxResults: 100 });
  return res.data.items ?? [];
}

export async function listTasks(listId: string, showCompleted = false) {
  const c = await getTasksClient();
  const res = await c.tasks.list({
    tasklist: listId,
    showCompleted,
    maxResults: 1000,
    showHidden: false,
  });
  return res.data.items ?? [];
}

export async function insertTask(listId: string, body: Partial<tasks_v1.Schema$Task>) {
  const c = await getTasksClient();
  const res = await c.tasks.insert({ tasklist: listId, requestBody: body });
  return res.data;
}

export async function updateTask(
  listId: string,
  taskId: string,
  body: Partial<tasks_v1.Schema$Task>
) {
  const c = await getTasksClient();
  const res = await c.tasks.patch({ tasklist: listId, task: taskId, requestBody: body });
  return res.data;
}

export async function deleteTask(listId: string, taskId: string) {
  const c = await getTasksClient();
  return c.tasks.delete({ tasklist: listId, task: taskId });
}
