# CFA migration examples

Each folder is a self-contained migration case. Open **Before.playground** to
explore the legacy approach and **After.playground** to explore the CFA approach.
The Before playground uses Swift 5 language mode; After uses Swift 6. Both target
macOS. The Swift 5 setting models legacy code; it does not require an old compiler.

Each case contains a `case.md` describing its starting point, behaviour contract,
changes, limitations and expected result. The implementation and the runnable
behaviour check have separate `MARK` headings. The run section is playground
lifecycle code, not app architecture. Fixtures simulate storage or network data and
are not production services. Run the automated checks from the toolkit root with
`node --test test/migration-playground.test.mjs`; the test harness compiles each
implementation in its declared language mode and executes its behaviour check.

These examples guide a migration; they do not prove another app has the same
behaviour or that changing architecture preserves all its requirements. Inspect
real callers, cancellation, failure handling and platform availability first.
Swift Concurrency is available in Swift 5.5 and later: Swift 6 language mode is
this suite's target for the migrated examples, not a prerequisite for CFA itself.

## Migration cases

- [Callback networking](Callback%20Networking/case.md)
- [MainActor result handling](MainActor%20Result/case.md)
- [Observation migration](Observation%20Migration/case.md)
- [Serial weight saves](Serial%20Weight%20Saves/case.md)
