# gcal‑cli — Design Specification (MVP)

## 1  Overview
A personal command‑line tool, **gcal‑cli**, for managing Google Calendar *events*, *tasks*, and daily *intentions/logs* across one default Google account. It emphasises fast keyboard workflows, Vim‑style editing, and simple flag‑based filtering. Implemented in **Bun + TypeScript** and run via `bunx gcal` (shell alias).

---

## 2  MVP Functional Specification

### 2.1  User Stories
| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| U1 | Daily planner | view **today’s agenda** (`gcal agenda --today`) | I can see all events, intentions, and tasks for the day. |
| U2 | Focused worker | run `gcal now` | I know what I’m doing right this minute. |
| U3 | Next‑step planner | run `gcal next` | I can see what starts after my current block. |
| U4 | Intent setter | capture a quick **intention** (`gcal intention "Write spec 09:30‑10:15"`) | it shows up with prefix `[ ]` and default 15‑min duration if no end time. |
| U5 | Event/task adder | add an item using *natural language* (`gcal add "1‑1 sync tomorrow 3‑3:30"`) | I don’t need tedious flag entry. |
| U6 | Editor power‑user | run `gcal edit <id>` and drop into `$EDITOR` | I can modify title/description quickly. |
| U7 | Task completer | mark an intention or task done (`gcal done <id>`) | it is checked off or prefix removed. |
| U8 | Information seeker | list items with filters (`gcal ls --after 2025‑04‑20 --before 2025‑04‑27 --cal work`) | I can audit past/future blocks. |
| U9 | Cleaner | delete an item (`gcal rm <id>`) | clutter disappears. |

### 2.2  Command Reference (flags abbreviated)
```
agenda   [--today|--after <date>|--before <date>|--range <a,b>] [--cal <name>] [--account <alias>] [--contains <str>]
now
next
add      <natural‑language string>
intention <natural‑language string>
edit     <id>
done     <id>
ls       [same flags as agenda]
rm       <id>
```
*Flags*  
`--today` (shorthand for `--after 00:00 --before 23:59`), `--after`, `--before`, `--range`, `--cal`, `--account`, `--contains`.

### 2.3  Intention & Task Semantics
* **Intention** ⇒ event **title starts with `[ ] `**.  
* **Log** ⇒ same calendar, no prefix.  
* `done` on an intention removes the prefix (treated as completed log).  
* Google Tasks merged into agenda views:  
  * Tasks **with explicit time** act like events.  
  * Tasks **without time** appear **after the last timed block** of the day.  
  * `now` ignores untimed tasks; `next` shows a task only when it has a start time.

### 2.4  Edge‑Case Rules
* **Recurring events** are expanded into concrete instances inside the query window.  
* Default duration = **15 minutes** when only a start is given.  
* System timezone assumed for all date math.  
* Only a single account in MVP; config allows future multiple‐account setup.

---

## 3  Technical Design

### 3.1  Runtime & Tooling
* **Bun + TypeScript**; target Node 18+ compatibility.  
* CLI parsing via **`commander`**.  
* Natural‑language date parsing via **`chrono‑node`**.  
* Google APIs via **`googleapis`** (Calendar v3, Tasks v1).

### 3.2  Authentication & Credentials
* OAuth **device code flow**.  
* Tokens cached under `~/.config/gcal‑cli/tokens.json` (per‑account).  
* Config file `config.json` holds:  
  ```json
  {
    "defaultAccount": "personal",
    "accounts": {
      "personal": {
        "clientId": "...",
        "calendarId": "primary",
        "taskListId": "@default"
      }
    },
    "editor": "$EDITOR"
  }
  ```

### 3.3  Data Model (in‑memory)
```ts
interface GcalItem {
  id: string;
  type: "event" | "task";
  title: string;
  start: Date | null;   // null for untimed tasks
  end:   Date | null;
  isIntention: boolean; // title startsWith "[ ] "
}
```

### 3.4  Local Cache & Sync Strategy (MVP)
* No offline write support.  
* Simple **fetch‑on‑demand** with per‑command cache (TTL 2 minutes) to limit API calls.

### 3.5  Command Flow Example (`add`)
1. Parse NL input with `chrono‑node` ⇒ start/end.  
2. If `intention`, add `[ ] ` prefix.  
3. Call `calendar.events.insert` with derived fields.

### 3.6  Editing Flow
* `gcal edit <id>` ⇒ fetch item ⇒ write temp file:
  ```
  Title: Weekly sync
  Start: 2025‑04‑17 15:00
  End:   2025‑04‑17 15:30
  Description:
  <existing text>
  ```
* On save & close, parse diffs and patch via Google API.

### 3.7  Error Handling
* Graceful 401 ⇒ prompt re‑auth.  
* Network errors ⇒ retry 3× then exit non‑zero.

---

## 4  MVP Task Breakdown & Timeline (4 Weeks)
| Week | Tasks | Deliverables |
|------|-------|--------------|
| 0 (½‑week) | ▸ Project scaffold (Bun, TS, `commander`)<br>▸ OAuth device‑flow POC | Repo with auth working, config loader |
| 1 | ▸ Implement **agenda**, **ls** with flag parsing<br>▸ Google Calendar fetch & NL parsing<br>▸ Recurring event expansion | `agenda` shows real data |
| 2 | ▸ Add **now**, **next**, **add**, **intention**<br>▸ `$EDITOR` integration for **edit**<br>▸ **done**, **rm** commands | All core commands functional |
| 3 | ▸ Google Tasks integration & merge logic<br>▸ Output formatting (cols, colours)<br>▸ Error handling & tests<br>▸ README usage docs | MVP ready for daily use |

### Parking‑Lot / Future
* Offline read/write & sync conflict resolution.  
* Multiple account context switching.  
* Query‑language filters & interactive `fzf` selectors.  
* Export/import (ICS, Markdown).  
* Homebrew formula & binary releases.

---

## 5  Next Steps
1. **Review this spec** → comment edits / approvals.  
2. Cut `week 0` tasks and start implementation once spec is frozen.

---
*Prepared by ChatGPT – Apr 16 2025*

