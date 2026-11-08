# Todays Twenty — Starter App

A CFA multiplication-practice Starter App and the editable source for the
**Day Streak** Xcode template. See the [Starter Apps catalogue](../README.md).
Open `TimesThirty.xcodeproj`, select the **TimesThirty** scheme and an iPhone simulator,
then Run. iOS 18+, Swift 6, Xcode 26.2. No account, backend or purchase is required.
For a physical device, choose your development team in Signing & Capabilities.

The app includes gradient hero cards, rounded surfaces, a seven-day streak strip,
native tabs and seven colour palettes plus Automatic.
It uses the toolkit's starter app icon, ready to replace with a product-specific icon.
Its bundle identifier is `com.3DaysOfSwiftConcurrency.TimesThirty`.

## Practice contract

- Start one main session each local calendar day. Every session needs **20 correct first attempts**.
- Each question presents nine unique choices. Correct answers become green with a checkmark;
  incorrect choices become red with an X. Meaning is not communicated by colour alone.
- After an incorrect answer, the learner may keep trying, but that question earns no point.
- Tapping the question reveals the correct choice and forfeits its point. Correct and
  revealed answers remain visible for two seconds before the next question appears
  automatically. Wrong answers stay on screen until the correct answer is found or
  revealed. There is no answer time limit. Leaving the foreground cancels the feedback
  delay; returning gives the resolved question a fresh two seconds. Disabled question
  and answer buttons retain their appearance; question changes do not crossfade.
  Completing the twentieth
  scored answer displays the session-complete screen rather than another question.
- Difficulty is adjustable on question one. Changing it replaces that question and clears
  any first-question point. The difficulty is fixed from question two onward.
- Gentle uses 2–5 multiplied by 2–10; Everyday uses 2–12; Challenge uses 6–19.
- Main completion grants one streak day. The learner may explicitly start one extra session
  of another 20 correct answers. It grants no second streak day. After that, practice locks.
- An interrupted session resumes with the same question, wrong choices, revealed state and
  score. Leaving and reopening cannot restart the allowance.
- At midnight the next day's main session becomes available. Yesterday's incomplete session
  stays in history but cannot be resumed or earn a streak. Already earned answer totals remain.
- An unfinished today keeps yesterday's streak alive until today ends. A missed day breaks
  the current streak, not history or the longest streak. Calendar arithmetic handles DST.

This is a local, offline learning aid, not a tamper-proof reward system. Changing the
device clock, deleting app data or reinstalling can affect the limits. Calendar calculations
use the device’s current calendar and time zone. History is local to the device; there is no sync, server validation, analytics or local AI.

## Reuse the blueprint

| Tab | Screen / ViewModel | Feature |
| --- | --- | --- |
| Practice | PracticeView / PracticeViewModel | PracticeFeature |
| Day Streak | DayStreakView / DayStreakViewModel | DayStreakFeature |
| Settings | SettingsView / SettingsViewModel | SettingsFeature |

`PracticeFeature` owns the daily session rules, question generation and scoring.
`DayStreakFeature` owns streak interpretation, longest streak and the seven-day display.
It consumes `completedActivityDays`, so the date-based algorithm and views can be reused
when replacing multiplication with another daily activity. Adapt its narrow activity
dependency and the labels; do not move streak rules into the UI or AppModel.

`AppModel.live()` composes the concrete features and their dependencies. Views own their
ViewModels and do not receive repositories or the singleton. The root stays visible even
if fetching saved practice fails. A screen reports and retries the failed request.

The `SwiftDataManager` owns lazy database creation at:
`Application Support/TimesThirty/Sessions.store` inside the app sandbox. It creates the
directory before opening the store. The isolated store upserts one session record; it
never replaces the entire history. Save failures roll back, and features publish progress
only after a successful save. Database files are never deleted as a recovery shortcut.

ViewModels retain/coalesce in-flight UI tasks. The feature serializes distinct mutations
and checks question IDs, so repeated or stale taps cannot double-score or skip questions.
The daily session is not cancelled when navigating between tabs.

## Native Xcode template

The generated **Day Streak** entry is maintained from this project:

```sh
python3 scripts/sync-day-streak-template.py
python3 scripts/sync-day-streak-template.py --check
```

Run these from the toolkit root. Do not edit the generated `.xctemplate` sources.
The toolkit installer includes it alongside CFA App and Habit Tracker.

## Verification

The Xcode test target has one file per Feature and ViewModel, plus storage tests.
Open `TimesThirty.xcodeproj`, select the **TimesThirty** scheme and an iPhone
simulator, then choose **Product → Test** (⌘U). The Xcode project is the single
entry point for building, running and testing this app.

Tests cover scoring, reveal, wrong attempts, difficulty locking, repeated/concurrent calls,
two-session limits, midnight, interrupted sessions, streak gaps, DST/leap days, isolated
preferences, database-directory failures and reopening the on-disk store.

For release readiness, also run the app on iPhone and iPad. Check light/dark and all themes,
VoiceOver, the largest Dynamic Type size, Reduce Motion, keyboard-free operation, wrong and
revealed answers, completing both sessions, background/foreground and persisted recovery.
