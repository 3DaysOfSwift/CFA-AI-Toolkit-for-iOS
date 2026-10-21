# Habit Tracker Template for iOS

Open `HabitTrackerTemplate.xcodeproj` in Xcode 26 or later. Choose the
`HabitTrackerTemplate` scheme and an iPhone simulator. The deployment target is
iOS 18; the project uses only Apple frameworks. Choose your signing team for a
physical device. No personal signing team is included.

This is the editable source for the toolkit's **Habit Tracker** Xcode template.
It includes Today, Habits and rightmost Settings tabs; completion/count habits;
daily streaks; light/dark themes; SwiftData persistence; and focused Swift Testing
suites for every screen ViewModel and Feature.

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
