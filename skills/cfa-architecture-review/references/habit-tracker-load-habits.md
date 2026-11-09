# Example: Habit Tracker Pro — Load Habits

This example follows the included Habit Tracker Pro starter app and demonstrates
CFA's synchronous startup signal and Feature-owned asynchronous loading.
Paths are relative to the toolkit repository:

- `starter-apps/Habit Tracker Pro/HabitTrackerPro/1 - View/App.swift`: the app
  delegate calls `AppModel.shared.applicationDidFinishLaunching()` directly.
- `starter-apps/Habit Tracker Pro/HabitTrackerPro/2 - AppModel/AppModel.swift`:
  AppModel calls `habitsFeature.startLoading()` synchronously.
- `starter-apps/Habit Tracker Pro/HabitTrackerPro/2 - AppModel/Features/Habits/HabitsFeature.swift`:
  the Feature starts and retains a reload task, shares it with additional reload
  callers, and serializes the repository operation with other habit operations.
- `starter-apps/Habit Tracker Pro/HabitTrackerPro/2 - AppModel/User Data Storage/Local/SwiftDataManager.swift`
  and `HabitRepository.swift`: the storage service and model actor fetch saved habits.

## What the Journey Shows

AppModel signals the Feature before the delegate returns. `startLoading()`
starts the Feature-owned reload task and returns without waiting for disk.
The reload task queues its work behind any previous habit operation. The queued
operation sets the loading state, awaits the repository and publishes the fetched
habits on the Main Actor. A failure is reflected in `loadError`; loading state
and the stored task handle are cleared when their respective work finishes.
A caller of `reload()` can await the existing reload instead of starting another.

The [Load Habits journey](../assets/load-habits-journey.html) illustrates these
steps. Actor calls and `await` do not themselves create child tasks. The Feature
creates a reload task and the operation queue creates a separate task for the
queued work; the diagram is source-derived, not a runtime recording.
