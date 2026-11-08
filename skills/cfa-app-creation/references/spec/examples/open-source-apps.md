# CFA project examples

## Starter apps included in the toolkit

The toolkit repository and full packages include ready-to-open Xcode projects in `starter-apps/`. See the [starter app guide](https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS/tree/main/starter-apps) for setup, project paths and tests. A separately installed skill may not include the projects; use the full toolkit or repository.

- **Habit Tracker** — habits, daily progress, streaks, SwiftData and Settings.
- **Habit Tracker Pro** — habits, charts and a StoreKit unlock.
- **Todays Twenty** — daily practice, saved sessions and day-streak behaviour.

Use these projects to trace a working screen through its ViewModel, Feature and services, as well as AppModel and tests. They are examples to inspect against the current specification, not a guarantee that every implementation is up to date.

## Open-source iOS apps

These real projects illustrate different capabilities and migration contexts. The source links point to specific revisions; the project links open the current repositories. App code can use older naming or differ from current CFA rules. Inspect the linked behaviour and apply the current specification; a link does not certify whole-app conformance.

- **[Trend](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA)** — Weight records and Feature-owned state. [View source](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA/blob/2a747bc222535e9fda01ed722e9c2c103fb98905/Trend/2%20-%20AppModel/Features/WeightLog/WeightLogFeature.swift).
- **[Next Rocket Launch](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency)** — Schedule ownership, provider refresh and optional cache. [View source](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/2%20-%20AppModel/Features/Launch%20Schedule/LaunchScheduleFeature.swift). [Detail View](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailView.swift). [Detail ViewModel](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailViewModel.swift).
- **[Cuentiva](https://github.com/3DaysOfSwift/Cuentiva)** — Search presentation and stale-result protection. [View source](https://github.com/3DaysOfSwift/Cuentiva/blob/3bf3a9d4b7714182edd6d6778c843e234714db50/Cuentiva/1%20-%20View/Views/Home/BookstoreViewModel.swift).
- **[Personal API](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA)** — Application composition and Feature access. [View source](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA/blob/b737865cedea92d3d85c2b8c0fd3eb7274dcc2a4/PersonalAPI/2%20-%20AppModel/AppModel.swift).
- **[Amigos](https://github.com/3DaysOfSwift/Amigos)** — Application composition and conversation capabilities. [View source](https://github.com/3DaysOfSwift/Amigos/blob/96a3878f6218b9d3e811309eb8469f845d3df6f2/Amigos/2%20-%20AppModel/AppModel.swift).
- **[Verbos](https://github.com/3DaysOfSwift/Verbos)** — Today capability and its state. [View source](https://github.com/3DaysOfSwift/Verbos/blob/27ae6fe4f9f3e6b10355b09d0f05480d21e51e0a/Verbos/2%20-%20AppModel/Features/Today/TodayFeature.swift).
- **[123 Calc](https://github.com/3DaysOfSwift/123-Calc)** — Calculator composition. [View source](https://github.com/3DaysOfSwift/123-Calc/blob/edebdcc9495dbe5d75088d161274499bfbfbfb3c/123%20Calc/2%20-%20AppModel/AppModel.swift).
- **[Phone Drive](https://github.com/3DaysOfSwift/Phone-Drive)** — File library and local-sharing composition. [View source](https://github.com/3DaysOfSwift/Phone-Drive/blob/81854fb55bfdbd62381d79c579856fa0f1a5af98/Phone%20Drive/2%20-%20AppModel/AppModel.swift).
- **[Cuentiva: Word Leap](https://github.com/3DaysOfSwift/Cuentiva-2-Word-Leap)** — Game capability and retained tasks. [View source](https://github.com/3DaysOfSwift/Cuentiva-2-Word-Leap/blob/ae936234171dd617f7a2affb093d3eca4ea3db84/CuentivaWordLeap/2%20-%20AppModel/Features/Word%20Leap/WordLeapFeature.swift).
- **[Metro Mate](https://github.com/3DaysOfSwift/metro-mate-ios)** — Metronome audio implementation; compare its existing structure with the current specification. [View source](https://github.com/3DaysOfSwift/metro-mate-ios/blob/5c3f21df0381eedba55dc45a9fd267d7da84cde7/Metronome/MetronomeManager.swift).
- **[Upcoming Movies](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-UpcomingMovies)** — Legacy app migration.
- **[CleanStore](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-CleanStore)** — Legacy app migration; see the migration branch for CFA work.
- **[Kickstarter](https://github.com/3DaysOfSwift/Legacy-GCD-Migration-iOS-App-Kickstarter)** — Ongoing legacy migration.
