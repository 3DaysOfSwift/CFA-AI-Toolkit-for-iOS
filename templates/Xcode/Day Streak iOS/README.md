# Day Streak iOS — Todays Twenty

A complete CFA multiplication-practice app and reusable daily-activity blueprint.
Open `TimesThirty.xcodeproj`, select the **TimesThirty** scheme and an iPhone simulator,
then Run. iOS 18+, Swift 6, Xcode 26.2. No account, backend or purchase is required.
For a physical device, choose your development team in Signing & Capabilities.

The original **Trend** project is untouched. This app carries over its gradient hero
cards, rounded surfaces, restrained typography, seven-day streak strip, native tabs
and Daylight/Midnight/Quiet palettes. Seven colour palettes plus Automatic are available.
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
  Completing the thirtieth
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
device clock, deleting app data or reinstalling can affect the limits. The calendar/time
zone is captured when the app's feature graph is created; restart after changing time zones.
History is local to the device; there is no sync, server validation, analytics or local AI.

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
The toolkit installer includes it alongside CFA App and Habit Tracker. Installation is
opt-in; creating this project did not install or replace anything in your Xcode library.

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
Source type-checking and macOS logic tests do not replace simulator/device UI validation.

### Initial validation — 21 October 2026

- All 24 Swift Testing cases passed on macOS, including real on-disk SwiftData round trips,
  using a temporary package harness that has since been removed. The tests remain in
  the Xcode test target; this historical result is not an iOS test run.
- All app Swift files passed the Swift 6 iOS 18 simulator-target compiler type-check.
- Native-template source synchronisation and installer tests passed; toolkit validation
  and its 63-test JavaScript suite passed.
- The CFA inspector mapped all three feature screens to their ViewModels, Features and
  tests. Its two lexical warnings were manually reviewed: ContentView is intentionally
  a structural root; `retryCommand` is a nested command value, not an aliased Feature.
- A full simulator build was attempted but asset/storyboard compilation could not access
  CoreSimulator in the agent's restricted environment. Simulator launch, screenshots,
  New Project wizard generation and on-device UI checks remain unverified. This is not
  a claim of a successful full Xcode build. The macOS storage tests also emitted sandbox
  notification-registration warnings; their save/reopen assertions passed.

### Compiler repair — 21 October 2026

The first Xcode run exposed a Swift 6.2.3 compiler crash during SettingsView code
generation for a bound actor-isolated difficulty setter. Type-checking alone did
not detect it. The crash was reproduced with actual x86_64 simulator compilation.
The two picker bindings now use explicit setter closures, without changing their
behaviour. All app Swift sources subsequently compiled and linked for both arm64
and x86_64 simulator targets, and the generated template was resynchronised.
This compiler check does not replace full Xcode resource compilation or UI testing.
