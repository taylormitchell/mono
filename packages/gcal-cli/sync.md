### Sync


1  Local store: one tiny SQLite DB
	•	Location ~/.cache/gcal‑cli/cache.db (XDG‑compliant).
	•	Why SQLite?
	•	Built‑in to Bun (bun:sqlite), zero deps.
	•	ACID & fast range queries → perfect for agenda/now/next views.
	•	Handles multi‑process locking if you ever script multiple calls in parallel.

Tables

calendars(id TEXT PRIMARY KEY, name TEXT, color TEXT, account TEXT);
events(id TEXT PRIMARY KEY, cal_id TEXT,
       start TEXT, end TEXT, allday INTEGER,
       summary TEXT, description TEXT,
       intention INTEGER, updated TEXT, cancelled INTEGER);
tasks(id TEXT PRIMARY KEY, tasklist TEXT,
      due TEXT, title TEXT, notes TEXT,
      updated TEXT, hidden INTEGER, completed INTEGER);
sync_state(source TEXT PRIMARY KEY, sync_token TEXT, last_full_sync TEXT);

intention is derived from the [ ] prefix at ingest time.

⸻

2  Sync strategy: “delta‑then‑catch‑up”

Google Calendar & Tasks APIs support sync tokens:
	1.	First run / full sync
	•	Pull the last 90 days of events/tasks (configurable window).
	•	Store the nextSyncToken Google returns.
	2.	Subsequent runs
	•	Call events.list(syncToken=…) and tasks.list(pageToken=…, syncToken=…).
	•	Upsert changed rows, delete rows flagged as status=cancelled.
	•	Write back new sync token; takes ~1 RTT and transfers only changes.
	3.	Token expiry fallback
	•	If Google returns 410 GONE, schedule an automatic background full sync (so the user doesn’t pay the latency). In the meantime, serve from cache.

⸻

3  When to sync

Trigger	Rationale
Cache miss (asking for a time window we’ve never stored)	e.g., agenda --after "next month".
Stale window (now > oldestCached+TTL)	Default TTL 5 min for “today”, 30 min for past/future days.
User‑forced gcal sync or --refresh flag	Manual override.
Background cron (optional)	bun run gcal sync --quiet in launchd/systemd every hour.

The sync runs concurrently: we return cached data immediately, spawn the fetch, and write an “updating…” badge to stderr so the user knows fresh data will be ready next invocation.

⸻

4  Read path updates (agenda/now/next)
	1.	Query cache first (SELECT … WHERE start >= ? AND end < ?).
	2.	If data present and fresh => render.
	3.	Otherwise:
	•	Kick a sync (foreground if blocking, background if acceptable).
	•	After sync completes (or background finishes), query again & render.

Most runs stay in step 1.

⸻

5  Consistency & edge cases
	•	Intentions and edits created by CLI
	•	Write‐through: we insert/update the DB immediately, then fire the remote insert.
	•	On success, overwrite row with canonical Google response (has server timestamps).
	•	On failure (e.g., offline) mark row pending=1; next sync retries.
	•	Conflicts (remote edit while offline)
	•	Compare updated timestamps; if ours is older we overwrite, if newer we keep ours and flag a conflict column so we can surface “needs review” in agenda.
	•	Multiple accounts
	•	account column on every table; sync_state keyed by account:cal_id and account:tasklist.

⸻

6  Opt‑in incremental rollout
	1.	Phase 1 – Ship a gcal sync command + cache read path behind --use-cache.
	2.	Phase 2 – Make cached reads default; sync on cache miss.
	3.	Phase 3 – Add background daemon or cron helper for always‑fresh data.
	4.	Phase 4 – Offline writes (pending queue).

Each phase is small and reversible—keeps the CLI snappy without over‑engineering v1.