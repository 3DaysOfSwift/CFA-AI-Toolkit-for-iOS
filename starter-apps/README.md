# Starter Apps

Working apps to get you going fast. Open an Xcode project, explore its screens,
features and tests, then make it your own. No template installation is required.

| Starter app | What you get | Open in Xcode |
| --- | --- | --- |
| [Habit Tracker](Habit%20Tracker/README.md) | Habits, daily progress, streaks, SwiftData storage and Settings | [HabitTrackerTemplate.xcodeproj](Habit%20Tracker/HabitTrackerTemplate.xcodeproj) |
| [Habit Tracker Pro](Habit%20Tracker%20Pro/README.md) | Habit Tracker plus charts and a one-time StoreKit unlock | [HabitTrackerPro.xcodeproj](Habit%20Tracker%20Pro/HabitTrackerPro.xcodeproj) |
| [Todays Twenty](Todays%20Twenty/README.md) | Daily multiplication practice, saved sessions and reusable day-streak behaviour | [TimesThirty.xcodeproj](Todays%20Twenty/TimesThirty.xcodeproj) |

These are customisable starting points, not a guarantee of App Store readiness.
Read each app's setup, verification and distribution notes. Configure your own
signing, product identity, artwork and any live services before distribution.
The Todays Twenty project retains its existing internal name, TimesThirty;
moving the folder does not rename targets, bundle identifiers or storage paths.

## Templates versus Starter Apps

[Xcode Templates](../templates/Xcode/README.md) appear in File → New → Project
after installation. CFA App is the general-purpose foundation; Habit Tracker and
Day Streak are feature-rich templates. Day Streak currently creates the
multiplication-practice experience demonstrated by Todays Twenty, not a blank
daily-activity app.

Starter Apps are ready-to-open projects. Habit Tracker and Todays Twenty are also
the editable sources of their native templates. Maintain one source, not two:

| Edit this starter app | Generate this Xcode template | Command from the toolkit root |
| --- | --- | --- |
| Habit Tracker | Habit Tracker | `python3 scripts/sync-habit-template.py` |
| Todays Twenty | Day Streak | `python3 scripts/sync-day-streak-template.py` |
| Habit Tracker Pro | None; standalone purchase example | No generation step |

Use each generation command with `--check` to detect stale template output.
Do not hand-edit generated template sources. The Xcode template installer installs
only the three `.xctemplate` folders, not these projects. Both sections remain
included in toolkit packages; this reorganisation does not add another installer.
