import { serve } from "bun";
import { listTaskLists, listTasks, insertTask, updateTask } from "./google";
import { listPage } from "./templates/list-page";

const port = 3000;

serve({
  port,
  fetch: async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Static assets under /public
    if (pathname.startsWith("/public/")) {
      return new Response(Bun.file(`.${pathname}`));
    }

    // ── Helper: simple redirect generator
    const redirect = (location: string) =>
      new Response("", { status: 303, headers: { Location: location } });

    // ──────────────────────────────────────
    //  GET / or /list/:id      (or /tag/:tag)
    // ──────────────────────────────────────
    if (
      req.method === "GET" &&
      (pathname === "/" || pathname.startsWith("/list/") || pathname.startsWith("/tag/"))
    ) {
      const lists = await listTaskLists();
      let currentListId: string | undefined;
      let tasks = [] as any[];
      let currentTag: string | undefined;

      if (pathname === "/") {
        // Pick first list as default
        currentListId = lists[0]?.id;
        tasks = currentListId ? await listTasks(currentListId, true) : [];
      } else if (pathname.startsWith("/list/")) {
        currentListId = pathname.split("/")[2];
        tasks = await listTasks(currentListId, true);
      } else if (pathname.startsWith("/tag/")) {
        currentTag = decodeURIComponent(pathname.split("/")[2]);
        // Fetch tasks from every list & filter by tag
        const all = await Promise.all(lists.map((l) => listTasks(l.id, true)));
        tasks = all
          .flat()
          .filter((t) => (t.title + " " + (t.notes ?? "")).includes(`#${currentTag}`));
      }

      // Build tag set across *current view* rules (all uncompleted tasks unless finished view)
      const openTasksForTagScan = pathname.startsWith("/tag/")
        ? tasks.filter((t) => !t.status || t.status === "needsAction")
        : (await Promise.all(lists.map((l) => listTasks(l.id, false)))).flat();
      const tags = [
        ...new Set(
          openTasksForTagScan.flatMap((t) => (t.title + " " + (t.notes ?? "")).match(/#\w+/g) ?? [])
        ),
      ]
        .map((s) => s.slice(1))
        .sort();

      const filter = url.searchParams.get("q") ?? "";
      const filteredTasks = filter
        ? tasks.filter((t) =>
            (t.title + " " + (t.notes ?? "")).toLowerCase().includes(filter.toLowerCase())
          )
        : tasks;

      return new Response(
        listPage({ lists, tasks: filteredTasks, currentListId, tags, currentTag, filter }),
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // ─────────────────────────
    //  POST /task (create)
    // ─────────────────────────
    if (req.method === "POST" && pathname === "/task") {
      const form = await req.formData();
      const listId = form.get("listId")!.toString();
      const title = form.get("title")!.toString();
      const notes = form.get("notes")?.toString();
      const due = form.get("due")?.toString();
      await insertTask(listId, { title, notes, due });
      return redirect(`/list/${listId}`);
    }

    // ─────────────────────────
    //  POST /task/:id (update)
    // ─────────────────────────
    if (req.method === "POST" && pathname.startsWith("/task/")) {
      const [, , taskId] = pathname.split("/");
      const form = await req.formData();
      const listId = form.get("listId")!.toString();

      if (form.get("status") === "toggle") {
        const completed = form.get("completed") === "on";
        await updateTask(listId, taskId, { status: completed ? "completed" : "needsAction" });
      } else {
        const title = form.get("title")?.toString();
        const notes = form.get("notes")?.toString();
        const due = form.get("due")?.toString();
        await updateTask(listId, taskId, { title, notes, due });
      }
      return redirect(req.headers.get("referer") || `/list/${listId}`);
    }

    // Fallthrough 404
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`📋  Google Tasks client running at http://localhost:${port}`);
