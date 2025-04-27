# Google Tasks Client (v2) — React + TypeScript + Tailwind + Replicache

## 1 · Core Feature Set (identical to v1)

| # | Scenario | Details |
|---|----------|---------|
| 1 | **Browse task-lists** | Sidebar lists every Google Task-list; click loads that list. |
| 2 | **Global `#tag` views** | Tag list in sidebar (parsed from every *open* task across all lists). Clicking a tag shows all tasks in every list that contain that tag. |
| 3 | **Free-text filter** | Search box filters by title + notes on the currently displayed set. |
| 4 | **Add task** | Quick-add row (title, optional due date). |
| 5 | **Edit task** | Inline or dialog edit (title, notes, due, status). |
| 6 | **Toggle complete** | Checkbox; completed tasks collapse under a "Completed" accordion. |
| 7 | **Task-list CRUD** | Create, rename, delete lists (sidebar). |

## 2 · Tech Stack Choices

| Layer | Selection | Rationale |
|-------|-----------|-----------|
| Front-end | **React 18 + TypeScript + Vite** | Fast HMR, TS first-class. |
| Styling | **Tailwind CSS** | Utility classes, easy dark-mode toggles. |
| State / Sync | **Replicache** | Local-first, optimistic UI, built-in mutation queue & conflict-free merges. |
| Back-end runtime | **Bun** (or Node) + Express-ish router | Already set up; minimal changes. |
| Persistence | **Google Tasks API v1** | Source of truth. |
| Auth | Installed-app OAuth 2.0 (refresh-token on disk). |
| Database | None (Replicache → Google Tasks); optional Redis for mutation queue. |

## 3 · High-Level Architecture

┌──────────────────────────┐
│        Browser           │
│  React  |  Replicache    │
└───▲─────────┬──────────▲─┘
│pull()   │push()    │
▼         │         ▼
┌─────────────┴────────────┐
│     Bun/Node Server      │
│  • /pull (GET)           │
│  • /push (POST)          │
│  • /oauth/*              │
└─────────────┬────────────┘
│Google Tasks REST
▼
Google Tasks API

* **Replicache pull**  
  *Server returns a **chronological change-log** (Version, `patch` JSON) for the requesting user.*  
* **Replicache push**  
  *Client sends queued **mutations** (`createTask`, `updateTask`, `deleteTask`, `createList`, …). Server executes them against Google Tasks and appends resulting patches to the log.*  

*For a single-user app the change-log can live in memory or a small SQLite/Redis table keyed by `version`.*

## 4 · Data Model

```ts
// Replicache "client-side DB" shape
type Task = {
  id: string          // Google Task ID
  listId: string
  title: string
  notes?: string
  due?: string        // RFC3339 date
  status: 'needsAction' | 'completed'
  updated: string     // ISO timestamp
};

type TaskList = {
  id: string          // Google Task-list ID
  title: string
  updated: string
};

type RootState = {
  tasks: Record<string, Task>;
  lists: Record<string, TaskList>;
  lastPulledVersion: number;
};
```

### Replicache Mutators

| Name | Parameters | Google API Call |
|------|------------|----------------|
| createTask | {listId, title, notes?, due?} | tasks.insert |
| updateTask | {listId, taskId, patch} | tasks.patch |
| toggleTask | {listId, taskId} | tasks.patch (status) |
| deleteTask | {listId, taskId} | tasks.delete |
| createList | {title} | tasklists.insert |
| renameList | {listId, title} | tasklists.update |
| deleteList | {listId} | tasklists.delete |

Server validates / executes each mutation, writes a patch entry ({version, op, object}) to the change-log, and returns the new lastMutationID to the caller.

## 5 · UI Component Tree (draft)

<App>
 ├─ <Sidebar>
 │    ├─ <ListList />
 │    ├─ <TagList />
 │    └─ <ListActions />
 └─ <MainPane>
      ├─ <Toolbar> (filter box)
      ├─ <TaskAddRow />
      ├─ <TaskList>
      │    └─ <TaskItem editable />
      └─ <CompletedAccordion />

Tailwind classes keep layout & dark-mode simple; component state comes solely from Replicache subscriptions (useSubscribe).

## 6 · Folder Layout

/client
  /src
    /components   (React components)
    /mutators     (Replicache mutator defs)
    /hooks        (custom hooks)
    main.tsx      (Vite entry)
  tailwind.config.ts
/server
  google.ts        (OAuth helpers)
  replicache.ts    (pull/push handlers + changelog store)
  server.ts        (Bun/Express router)
  package.json
