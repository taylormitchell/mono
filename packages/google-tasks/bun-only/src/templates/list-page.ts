import { html, layout } from "./layout";
import { sidebar } from "./sidebar";

export function listPage({
  lists,
  tasks,
  currentListId,
  tags,
  currentTag,
  filter = "",
}: {
  lists: any[];
  tasks: any[];
  currentListId?: string;
  tags: string[];
  currentTag?: string;
  filter?: string;
}) {
  // Split open vs completed
  const open = tasks.filter((t) => !t.status || t.status === "needsAction");
  const done = tasks.filter((t) => t.status === "completed");

  const taskItem = (t: any) => html`<li
    class="task ${t.status === "completed" ? "done" : ""}"
    data-id="${t.id}"
  >
    <form method="post" action="/task/${t.id}" class="inline">
      <input type="hidden" name="listId" value="${currentListId || t.listId}" />
      <input type="hidden" name="csrf" value="{{CSRF}}" />
      <input
        type="checkbox"
        name="status"
        value="toggle"
        ${t.status === "completed" ? "checked" : ""}
      />
      <span class="title">${t.title}</span>
    </form>
  </li>`;

  const content = html` <h2>
      ${currentTag ? `#${currentTag}` : lists.find((l) => l.id === currentListId)?.title ?? "Tasks"}
    </h2>

    <form class="add" method="post" action="/task">
      <input type="hidden" name="listId" value="${currentListId || ""}" />
      <input type="text" name="title" placeholder="New task…" required />
      <input type="date" name="due" />
      <button>Add</button>
    </form>

    <input id="filter" placeholder="Filter…" value="${filter}" />

    <ul class="tasks">
      ${open.map(taskItem).join("")}
    </ul>
    ${done.length
      ? html`<details>
          <summary>Completed (${done.length})</summary>
          <ul class="tasks done">
            ${done.map(taskItem).join("")}
          </ul>
        </details>`
      : ""}`;

  return layout({
    title: "Tasks",
    sidebar: sidebar({ lists, currentListId, tags, currentTag }),
    body: content,
  });
}
