import { serve } from "bun";
import { listTaskLists, listTasks } from "./google";
import { loadState, saveState, nowMicros } from "./state";

const port = 3001;
const pullCache: { data: any; expires: number } = { data: null, expires: 0 };

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Set CORS headers for all responses
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-replicache-requestid",
    };

    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/pull") {
      const res = await handlePull(req, url);
      Object.entries(headers).forEach(([key, value]) => {
        res.headers.set(key, value);
      });
      return res;
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🔄 Bun server listening at http://localhost:${port}`);

async function handlePull(req: Request, url: URL): Promise<Response> {
  const clientID = url.searchParams.get("clientID") ?? "anon";
  // clientVersion is unused in snapshot mode but parsed for API conformity
  const state = await loadState();

  // Snapshot caching (30s)
  if (Date.now() < pullCache.expires && pullCache.data) {
    return json(pullCache.data(state, clientID));
  }

  const lists = await listTaskLists();
  const tasksArrays = await Promise.all(
    lists.map((l) => listTasks(l.id!).then((tasks) => tasks.map((t) => ({ listId: l.id, ...t }))))
  );
  const tasks = tasksArrays.flat();

  const serverVersion = Math.max(nowMicros(), state.lastServerVersion + 1);
  state.lastServerVersion = serverVersion;
  await saveState(state);

  const patch = [
    { op: "clear" },
    ...lists.map((l) => ({ op: "put", key: `list/${l.id}`, value: l })),
    ...tasks.map((t) => ({ op: "put", key: `task/${t.id}`, value: t })),
  ];

  const respBody = {
    cookie: serverVersion,
    lastMutationIDChanges: {
      [clientID]: state.lastMutationIDByClient[clientID] ?? 0,
    },
    patch,
  };

  // Store in cache
  pullCache.data = (st: typeof state, id: string) => ({
    cookie: serverVersion,
    lastMutationIDChanges: {
      [id]: st.lastMutationIDByClient[id] ?? 0,
    },
    patch,
  });
  pullCache.expires = Date.now() + 30_000;

  return json(respBody);
}

function json(data: any): Response {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}
