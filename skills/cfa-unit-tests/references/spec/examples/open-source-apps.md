# CFA project examples

## Starter apps included in the toolkit

The toolkit repository and full packages include ready-to-open Xcode projects in `starter-apps/`. See the [starter app guide](https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS/tree/main/starter-apps) for setup, project paths and tests. A separately installed skill may not include the projects; use the full toolkit or repository.

- **Habit Tracker** — habits, daily progress, streaks, SwiftData and Settings.
- **Habit Tracker Pro** — habits, charts and a StoreKit unlock.
- **Todays Twenty** — daily practice, saved sessions and day-streak behaviour.

For current AppModel composition and synchronous startup, see the bundled `starter-apps/Habit Tracker Pro/HabitTrackerPro/2 - AppModel/AppModel.swift`. Use the starter projects to trace a working screen through its ViewModel, Feature and services, as well as AppModel and tests. They are examples to inspect against the current specification, not a guarantee that every implementation is up to date.

## Open-source iOS apps

These real projects illustrate different capabilities and migration contexts. The source links point to specific revisions; the project links open the current repositories. App code can use older naming or differ from current CFA rules. Inspect the linked behaviour and apply the current specification; a link does not certify whole-app conformance.

- **[Trend](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA)** — Weight tracking and progress.
- **[Next Rocket Launch](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency)** — Selected launch snapshots and detail presentation. [Detail View](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailView.swift). [Detail ViewModel](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailViewModel.swift).
- **[Cuentiva](https://github.com/3DaysOfSwift/Cuentiva)** — Reading and language learning.
- **[Personal API](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA)** — Personal knowledge and conversations.
- **[Amigos](https://github.com/3DaysOfSwift/Amigos)** — Spanish conversation practice.
- **[Verbos](https://github.com/3DaysOfSwift/Verbos)** — Spanish verb practice.
- **[123 Calc](https://github.com/3DaysOfSwift/123-Calc)** — Calculator.
- **[Phone Drive](https://github.com/3DaysOfSwift/Phone-Drive)** — File library and local sharing.
- **[Cuentiva: Word Leap](https://github.com/3DaysOfSwift/Cuentiva-2-Word-Leap)** — Game capability and retained tasks. [View source](https://github.com/3DaysOfSwift/Cuentiva-2-Word-Leap/blob/ae936234171dd617f7a2affb093d3eca4ea3db84/CuentivaWordLeap/2%20-%20AppModel/Features/Word%20Leap/WordLeapFeature.swift).
- **[Metro Mate](https://github.com/3DaysOfSwift/metro-mate-ios)** — Metronome audio and timing migration example using AVAudioEngine, Timer and DispatchSourceTimer. [View source](https://github.com/3DaysOfSwift/metro-mate-ios/blob/5c3f21df0381eedba55dc45a9fd267d7da84cde7/Metronome/MetronomeManager.swift).
- **[Upcoming Movies](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-UpcomingMovies)** — Legacy app migration.
- **[CleanStore](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-CleanStore)** — Legacy app migration; see the migration branch for CFA work.
- **[Kickstarter](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-Kickstarter)** — Ongoing legacy migration.
