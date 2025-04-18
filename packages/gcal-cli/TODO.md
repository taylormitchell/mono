

## Asks

I want to quickly create an event representing what I'm currently doing.
So I'll say something like "Playing with o3 for 1h" or "Playing with o3 til 11am" and it should create an event like "Playing with o3" with a start/end time according to the time I said.
The title should be prefixed with "[ ] " to indicate it's a todo.

Related to the above, or maybe the same thing: I want to be able to quickly time-box my work.
So I'll say "Work on issue #123 for 1h" and somehow specify that I want to be notified when the timer is up.
I sometimes manually do that workflow by creating an event when I want to be done like "Times up!" with a notification set to 0 minutes before the event starts. I'm guessing we can do something similar here.

I want to be able to see all events at or after right now. So exclude past events.

I want events in my primary calendar included in the default calendars (right now it's just ["Work intentions", "Intentions"])

I want ids for events included at the end of the line between parentheses.

In agenda view, todos that don't have a scheduled time (i.e. are "All day") should be at the bottom in a separate section.

## Plan

1. Phase 1 – “Quick Add” & Time‑boxing
   a. Define a single “quick‑add” verb (or extend your existing “add” command) to accept NL like
    * “Playing with o3 for 1h”
    * “Playing with o3 til 11am”
         b. Parse out:
            – title (`“Playing with o3”`)
            – duration (`1h`) or end‑time (`til 11am`)
            – optional “issue #123” tag
         c. Default title prefix `[ ] ` for todos
         d. Hook into your calendar client to create an event with start/end according to the parse
         e. Support an optional flag (e.g. `--notify`) or keyword (e.g. “notify me”) to add a popup alert at 0 minutes before end
         f. Write unit tests around your parser and integration tests for the event creation
2. Phase 2 – Default Calendars & Time‑filtered Listing
   a. Augment your config to treat the primary calendar as part of “default calendars” alongside ["Work Intentions","Intentions"]
   b. Modify your “list” (or “agenda”) command so that by default it:
      – only fetches events whose end time ≥ now (i.e. auto‑filters out past events)
      – can still take explicit date‑range overrides
   c. When printing each event line, append the internal `id` in parentheses at end:
     `[ ] Playing with o3 2–3 pm (abcdef123456)`
   d. Add tests covering both filtering and the new calendar‑list behavior
3. Phase 3 – Agenda View & All‑Day “Todos” Section
   a. In your “agenda” view, split out:
      – Timed events (show first, in chronological order)
      – All‑day / unscheduled todos (show below, under a header like **“Unscheduled Todos”**)
   b. Make sure all‑day items still have the `[ ] ` prefix and (id) suffix
   c. Add acceptance tests / screenshots of expected layout
4. Cross‑Cutting / Finish‑Up
   • Update README.md / CLI help to document the new quick‑add syntax and defaults
   • Add examples to docs & README (e.g. “Work on issue #123 for 1h --notify”)
   • Ensure consistent error‑messages when parse fails (e.g. “couldn’t understand ‘til 11xm’”)
   