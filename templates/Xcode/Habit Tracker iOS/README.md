# Habit Tracker Template for iOS

Open `HabitTrackerTemplate.xcodeproj` in Xcode 26 or later. Choose the
`HabitTrackerTemplate` scheme and an iPhone simulator. The deployment target is
iOS 18; the project uses only Apple frameworks. Choose your signing team for a
physical device. No personal signing team is included.

This is the editable source for the toolkit's **Habit Tracker** Xcode template.
It includes Today, Habits, Day Streak and rightmost Settings tabs; completion/count habits;
daily streaks; seven colour themes plus Automatic; SwiftData persistence; and focused Swift Testing
suites for every screen ViewModel and Feature.

Each tab has its own concrete Feature:

| Tab | ViewModel | AppModel property | Responsibility |
| --- | --- | --- | --- |
| Today | TodayViewModel | todayFeature | Daily progress and completion behaviour |
| Habits | HabitsViewModel | habitsFeature | Authoritative habit collection and persisted mutations |
| Day Streak | DayStreakViewModel | dayStreakFeature | Current/longest streaks, completed-day totals and recent activity |
| Settings | SettingsViewModel | settingsFeature | Settings preferences |

`TodayFeature` receives the same `HabitsFeature` instance exposed by AppModel.
It derives daily progress from that owner instead of keeping a second habit
collection. `TodayFeatureTests` and `AppModelTests` exercise cross-tab consistency.

`DayStreakFeature` also reads that same HabitsFeature. Habits and their storage
do not depend on streaks. Streak summaries use all recorded history, while the
screen shows the last seven calendar days for each habit. A day qualifies when
the habit target is met (or a positive value is recorded for an untargeted
habit). A streak ending yesterday remains current until today ends; future
entries never count. Tests cover gaps, targets, duplicate dates, multi-year
history, daylight saving and recoverable loading failures. No storage schema
or existing habit records are changed by this separation.

Count rows save valid edits automatically, without an inline Save button. Custom
row controls have 48-point touch targets and their own line below the habit
title. Pending edits survive navigation; failed writes retain the draft and
offer Retry. The separate Add Habit editor retains navigation Cancel/Save.

The app delegate signals launch. AppModel constructs Features through `live()`
without opening storage. The shared SwiftDataManager opens its database lazily
within a data request. Failures are presented by the affected screen, not by the
App or root navigation; Settings remains independent of the habit database.

## Maintain and validate

Edit this project, then run these commands from the toolkit root:

```sh
python3 scripts/sync-habit-template.py
python3 scripts/sync-habit-template.py --check
npm test
npm run validate
```

Use Product → Test to execute the project's Swift Testing suites. Repository
doubles test feature and ViewModel behaviour; they do not verify a real damaged
SwiftData store or simulator navigation during an opening failure.

The native template is generated under
`templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate`.
The toolkit installer installs both CFA App and Habit Tracker. Do not edit the
generated copy or embed an `.xcodeproj` inside it.

The ready-to-open project uses `com.3DaysOfSwiftConcurrency.HabitTrackerTemplate`
and appends the test target name for tests. Native template users supply their
own organisation identifier; Matthew uses `com.3DaysOfSwiftConcurrency`.
Supply original App Store icon artwork before distribution.
