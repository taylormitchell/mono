# Home

This README is a WIP. 

A home for my personal digital life. 

It's a bit of an experiment in mono-repo maximalism. What if I put *all* my personal stuff in a single repo? It would get absurdly large if I included all images and videos, but a lot of my digital life exists in the form of text, so it might be reasonable for that. 

So far it's just my recent personal notes and side projects. The notes are usually in [data](/data) but aren't included in the public version of the repo.

One kinda wacky thing I'm doing is including app data inside the repo too. For example, I've got a [rest api](/packages/api/README.md) which is used for web apps like [this logging app](packages/log-web/README.md). The api is in the repo, and the data it's serving is too. When the logging app posts data, the api appends it to the relevant file and then commits and pushes to the remote repo. This feels super weird when I've got my professional software engineer hat on. But if I think of the repo as just a file system with the added benefit of a git history, then keeping code and data together makes sense. I don't think this set up would work for a team or production apps, but for personal stuff it's working well so far.

## Dev ops

The [infra](/packages/infra) folder contains some scripts to deploy to my various machines. All web apps are deployed to a single ec2 instance. The cli apps and cron jobs are deployed to my mac. I've got a couple configs for my pc too.

I have a [sync script](/packages/infra/mac/sync.sh) which automatically commits, pulls, and pushes to github. It runs every minute via a cron job. This would be a crazy set up if working with a team, but for personal stuff I find I'm hardly ever using commits or branches. I just want a history of changes and a remote I can access from anywhere which stays in sync. It'll only sync the main branch, so if I do want to work on something without syncing, I just create a new branch.


## How I use it

- All my personal notes are in [data](/data).
- All my side projects are in [packages](/packages).
- I keep the repo open in cursor most of the day. In [.cursorrules](.cursorrules) I've added some
instructions to tell cursor it's meant to help me with my notes 
- I use [Working Copy](https://workingcopy.app/) on iOS to access my notes and projects. I've got a few shortcuts set up to create a quick note or open my daily note.



I keep all my todos interspersed across my notes and packages. I have a [todo cli](/packages/todo-cli/README.md) which can list and filter these todos.

The [note cli](/packages/note-cli/README.md) has a few commands to help me quickly create or open notes. I primarily use it to create a "post" note whose filename is just a timestamp and then opens in cursor. I use this to jot down ideas without needing to think about where it's saved. I also have a few commands for creating and opening daily/weekly notes.
