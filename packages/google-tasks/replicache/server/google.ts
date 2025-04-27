import fs from "fs/promises";
import path from "path";
import { authenticate } from "@google-cloud/local-auth";
import { google, tasks_v1 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/tasks"];
const TOKEN_DIR = path.join(process.env.HOME ?? "~", ".config/google-personal");
const TOKEN_PATH = path.join(TOKEN_DIR, "token.json");
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH ?? "";
if (!GOOGLE_CREDENTIALS_PATH) {
  throw new Error("GOOGLE_CREDENTIALS_PATH is not set");
}

let tasks: tasks_v1.Tasks | null = null;

export async function getTasksClient(): Promise<tasks_v1.Tasks> {
  if (tasks) return tasks;
  await fs.mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  const auth = await authorize();
  tasks = google.tasks({ version: "v1", auth });
  return tasks;
}

async function authorize() {
  // read the client ID/secret every time
  const credRaw = await fs.readFile(GOOGLE_CREDENTIALS_PATH, "utf8");
  const { installed } = JSON.parse(credRaw);
  const { client_id, client_secret, redirect_uris } = installed;

  // try existing token
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf8");
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(JSON.parse(raw));
    return auth; // <-- will auto-refresh now
  } catch {}

  // first-run flow
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: GOOGLE_CREDENTIALS_PATH,
  });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(auth.credentials), { mode: 0o600 });
  return auth;
}

// Convenience wrappers
export async function listTaskLists() {
  const c = await getTasksClient();
  const res = await c.tasklists.list({ maxResults: 100 });
  return res.data.items ?? [];
}

export async function listTasks(listId: string) {
  const c = await getTasksClient();
  const out: tasks_v1.Schema$Task[] = [];
  let pageToken: string | undefined;
  do {
    const res = await c.tasks.list({
      tasklist: listId,
      maxResults: 1000,
      showCompleted: true,
      pageToken,
    });
    out.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}
