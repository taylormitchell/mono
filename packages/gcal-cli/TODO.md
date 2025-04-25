TODOs:

- [x] I noticed that "all day" todos show up as 20:00. I'm guessing they have a UTC 0:00 time and then my local time is converted to that. If it's an all day todo, I don't want to see it with a time at all. I want the todos placed at the bottom without a time.
```
gcal-cli % gcal agenda

Fri, Apr 18, 2025
─────────────────
20:00  · [ ] Try on suit
20:00  · [ ] Play with keyboard

Sat, Apr 19, 2025
─────────────────
09:00  Worked on ridge ring return and Ray's gift
11:00  national judging course - day 1
```

- [ ] When I click on a TODO and complete it, have it update the cache. Actually, I think I need a config approach where my various CLI projects (this one, `p`, etc) have a common config management system.

- [ ] Create a bash helper script for `gcal` and `p`. For example, I have a system I run called "OG" (operational goals) and "OG Week x", which is a doc with my current projects. I'd like to create a concept of a "sprint" which is 1-2 weeks. Then have a command like `gcal sprint start` which creates a series of todos and events for the sprint. This is getting a bit specific to me. But I'd like "gcal" and "p" to know if I'm in a sprint, and show me my sprint stats from the CLI.