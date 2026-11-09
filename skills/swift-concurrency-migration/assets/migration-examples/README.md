# CFA migration examples

Each folder is a self-contained migration case. Open **Before.playground** to
explore the legacy approach and **After.playground** to explore the CFA approach.
The Before playground uses Swift 5 language mode; After uses Swift 6. Both target
macOS. The Swift 5 setting models legacy code; it does not require an old compiler.

Each case contains a `case.md` describing its starting point, behaviour contract,
changes, limitations and expected result. The implementation and the runnable
behaviour check have separate `MARK` headings. The run section is playground
lifecycle code. Fixtures simulate storage, networking or observation for the
behaviour checks. In the Observation example, the locked callback counter is
test instrumentation. The migrated Feature keeps its observable state on
`MainActor`. In Callback Networking, the unchecked conformance belongs to the
`URLProtocol` test subclass, which adds no mutable state. In the toolkit source checkout, run the automated
checks from its root with `node --test test/migration-playground.test.mjs`; the
test harness checks the playground structure on all supported test platforms.
On macOS with Xcode, it compiles the example code with `swiftc` in the declared
language mode and runs the behavioural assertions using a command-line entry
point. Open and run the playgrounds in Xcode to verify the playground launchers.
The installed skill and release package include the playgrounds.

Before applying an example to an app, check its callers, cancellation and
failure handling. Check the availability of the APIs on the app’s minimum OS
separately from Swift language mode. The migrated Serial Weight Saves,
MainActor Result and Observation Migration examples all use Observation, which
requires macOS 14 for these playgrounds and iOS 17 when applied to an iOS app.
Keep a compatible observation mechanism when the target supports earlier OS
versions. Swift 6 is the language mode chosen for the After examples. Swift
Concurrency is available in Swift 5.5 and later.

## Migration cases

- [Callback networking](Callback%20Networking/case.md) preserves a successful
  decode, an HTTP 503 error and a malformed JSON error when moving to async URLSession.
- [MainActor result handling](MainActor%20Result/case.md) preserves publication
  before completion and demonstrates failed refresh, retry and overlapping calls.
- [Observation migration](Observation%20Migration/case.md) preserves the current
  Feature value while showing how notification delivery differs from Combine.
- [Serial weight saves](Serial%20Weight%20Saves/case.md) preserves distinct save
  outcomes and verifies admission order across a failing command in the source
  checkout's automated test.
