# CFA apps and migration examples

These open-source iOS projects are the practical companion to the CFA
specification. They are not templates to copy blindly: each has a product
purpose and a different point in its architectural journey. Read them to see
how ownership and implementation choices appear in working application code.

| Project | CFA relationship | Repository |
| --- | --- | --- |
| Cuentiva | Created using CFA | [Open Cuentiva](https://github.com/3DaysOfSwift/Cuentiva) |
| Personal API iOS App | Created using CFA and Swift Concurrency | [Open Personal API iOS App](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA) |
| Trend iOS App | Created using CFA and Swift Concurrency; its weight log illustrates feature-owned data | [Open Trend](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA) |
| RocketLaunch iOS App | Created using CFA and Swift Concurrency | [Open RocketLaunch](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency) |
| Metro Mate iOS | An open-source metronome with an audio implementation to examine during migration | [Open Metro Mate](https://github.com/3DaysOfSwift/metro-mate-ios) |

## How to use these projects

- **Starting a new app:** use CFA App Creation and the bundled starter apps for current AppModel,
  ViewModel and Feature examples.
- **Adding a feature:** follow the existing app's feature owner, repository,
  ViewModel and AppModel wiring rather than placing business rules in a View.
  The toolkit names new concrete owners `*Feature`; these older projects may
  retain their existing `*Manager` names until a deliberate migration.
- **Migrating legacy code:** inspect the bundled migration examples for
  behaviour-preserving changes, and use Metro Mate to explore the additional
  audio and timing requirements of a real app before planning a migration.
- **Reviewing a project:** run Xcode Project Dashboard locally, then inspect the
  source behind each finding. A dashboard report is evidence to investigate,
  not an automatic proof of correctness.

Each repository has its own README, deployment target, dependencies, test state
and product decisions. CFA provides common ownership and maintenance principles;
it does not require every app to have identical features or implementation
details.
