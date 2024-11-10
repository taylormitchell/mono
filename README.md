# Home

A home for my personal digital life. At the moment it's mainly my personal notes and side projects. 

If you're reading this, you're seeing the public version of this repository, which excludes private data,
including my notes which would usually be in [data](/data).



How I use this:
- All my personal notes are in [data](/data).
- All my side projects are in [packages](/packages).
- I keep the repo open in cursor most of the day. In [.cursorrules](.cursorrules) I've added some
instructions to tell cursor it's meant to help me with my notes 
- I use [Working Copy](https://workingcopy.app/) on iOS to access my notes and projects. I've got a few shortcuts set up to create a quick note or open my daily note.


Keeping everything in the same repo 

The [infra](/packages/infra) folder contains some scripts to deploy to my mac and ec2 instances. All web apps are deployed to ec2. The cli apps and cron jobs are deployed to my mac.

I have a [sync script](/packages/infra/mac/sync.sh) which automatically commits, pulls, and pushes to github. It runs every minute via a cron job. This would be a crazy set up if working with a team, but for personal stuff I find I'm hardly ever using commits or branches. I just want a history of changes and a remote I can access from anywhere which stays in sync.

I keep all my todos interspersed across my notes and packages. I have a [todo cli](/packages/todo-cli/README.md) which can list and filter these todos.

The [note cli](/packages/note-cli/README.md) has a few commands to help me quickly create or open notes. I primarily use it to create a "post" note whose filename is just a timestamp and then opens in cursor. I use this to jot down ideas without needing to think about where it's saved. I also have a few commands for creating and opening daily/weekly notes.
