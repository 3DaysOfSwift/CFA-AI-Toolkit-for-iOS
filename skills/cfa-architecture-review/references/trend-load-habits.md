# Example: Trend — Load Habits

This source-derived example describes Trend at commit `2a747bc`. It is an
illustration of the inspected code, not a runtime recording. Recheck the source
when reviewing another revision. Trend’s current launch path below does not
fully match CFA’s direct Feature startup guidance.

## Evidence to Revisit

Paths below are relative to the Trend repository, not this skill directory:

- `Trend/1 - View/TrendApp.swift`: the application delegate calls AppModel’s
  launch method synchronously.
- `Trend/2 - AppModel/AppModel.swift`: the launch method starts an unstructured
  task calling `habitsFeature.load()`.
- `Trend/2 - AppModel/Features/Habits/HabitsFeature.swift`: `load()`,
  `loadLocalData()`, `waitForPreviousOperation()`, `finishOperation()` and
  `publishSuccessfulResult(_:)`.
- `Trend/2 - AppModel/Features/Habits/HabitsWorker.swift`: `load(on:)` and
  `calculateSummaries(_:on:)`.
- `Trend/2 - AppModel/User Data Storage/Local/LocalDataStore.swift`:
  `LocalHabitRepository.load()` calls the storage actor’s `loadHabits()`, which
  reads the local SwiftData store. The live store is configured for CloudKit
  synchronization; this load path itself reads local storage.

## What the Journey Shows

The delegate calls AppModel synchronously; AppModel creates unstructured Task A
to request the load. On a first load, HabitsFeature creates
and retains unstructured Task B, then A awaits B's value. B takes the Feature's
local operation gate, waiting in a continuation list only if needed. After
acquiring the gate, B sets loading state when not already ready and captures the
date. The same B calls the worker, local repository and storage actor; none of
these calls creates a child. The storage actor opens the SwiftData container on
first access and reads the local store. The worker calculates daily, weekly,
streak and lifetime summaries. B returns to MainActor, publishes data and ready state, releases the
gate, clears its handle and completes. A can then resume and finish.

Repeated callers await the existing B. A ready Feature can return immediately.
Read errors become observable failed state rather than escaping `load()`.
A caught CancellationError restores the previous load state. Cleanup still runs.
Cancelling A does not automatically cancel B. CloudKit synchronization is
managed by the configured SwiftData container; this source trace does not
measure synchronization or launch timing. The current CFA
default calls Feature startup synchronously and lets the Feature own any tasks;
this current Trend implementation should not be copied as that default.

## Included Visual

[Load Habits journey](../assets/load-habits-journey.html) is the compact two-lane
interactive example approved by the user. It highlights seven steps, keeping
A's waiting period aligned with B's work. It intentionally groups intermediate
actor hops rather than displaying a column for every type.

The asset is an HTML fragment for a host providing visualization styles and
theme variables; it is not a standalone website. Adapt its labels and stages to
fresh source evidence. Use the available visualization renderer, or supply a
standalone wrapper/styles when exporting elsewhere. Never copy Trend's task
count, ownership or storage and loading assumptions into an unrelated app.
