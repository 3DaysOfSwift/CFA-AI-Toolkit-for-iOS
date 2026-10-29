# Xcode Templates

Install these to create a new project through Xcode's File → New → Project chooser.
Run `Install Xcode Template.command` from the toolkit root, then reopen Xcode.

| Template | Starting point | Maintained source |
| --- | --- | --- |
| CFA App | General-purpose CFA foundation | Its `.xctemplate` folder |
| Habit Tracker | Habit tracking, daily progress, streaks and persistence | [Habit Tracker Starter App](../../starter-apps/Habit%20Tracker/README.md) |
| Day Streak | Daily multiplication practice with reusable streak behaviour | [Todays Twenty Starter App](../../starter-apps/Todays%20Twenty/README.md) |

Native templates live in `Project Templates/iOS/Application/`. Habit Tracker and
Day Streak are generated from their Starter Apps; edit those projects and use
the generation commands in their READMEs. CFA App is maintained directly.

Want an existing project you can open immediately? Browse
[Starter Apps](../../starter-apps/README.md), including Habit Tracker Pro with
charts and a StoreKit purchase example. Starter Apps are not installed into the
Xcode project chooser.
