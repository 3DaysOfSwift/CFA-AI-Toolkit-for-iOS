---
name: cfa-unit-tests
description: Write, organise and audit meaningful unit tests for CFA SwiftUI applications. Use when adding tests, reviewing test quality or restructuring a CFA test suite.
---

# CFA unit tests

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

Apply the specification's screen-construction invariant within the requested
scope: private inline `@State` ViewModel creation, zero screen initializer inputs,
and no defaulted ViewModel injection or custom State initialization. Distinguish
stateless snapshot components from feature-connected screens. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Read the [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md), [product
behaviour contract](references/product-behaviour-contract.md) and [Swift coding
guide](references/swift-coding-guide.md). Keep production decisions in Features
and presentation state in ViewModels; never move a business rule into
a ViewModel merely to make it easier to test.

For a review-only request, inventory and report without editing. For a writing
request, first establish the current test result and map real behaviour to
tests. Do not create tests that only prove stored values can be read back from a
struct or that an object can be constructed.

Organise a test tree that exposes the application design:

```text
<App>Tests/
├── AppModelTests/
├── ViewModelTests/       # one named file for each production ViewModel
├── FeatureTests/<Feature>/ # one <Feature>Tests.swift home per concrete Feature
├── ConcurrencyTests/<Feature>/
├── PersistenceTests/
├── IntegrationTests/
└── Support/
```

For each public Feature API operation and meaningful ViewModel behaviour,
consider applicable success, validation/boundary, failure/retry, duplicate,
cancellation and overlapping-operation scenarios. Assert observable results,
state transitions and side effects rather than private implementation details.
Use injected repositories, clocks, clients and controllable continuations; do
not use live services, arbitrary sleeps or scheduler luck.

For retained ViewModel tasks, prove repeated equivalent actions share one
execution and await completion, including failure and retry. Independently test
each Feature's sharing or sequential-queue policy with multiple callers:
equivalent requests receive the shared outcome; distinct queued inputs execute
in admission order and receive their own outcomes. Cover cancellation, cleanup
and later work after failure without losing or indefinitely suspending waiters.

Build AppModel tests from an isolated dependency graph. Do not call production
`AppModel.shared` from a unit test. Give each production ViewModel a matching
test file and test what its View can observe: loading/ready/error states,
actions, drafts, selection and asynchronous results.
Give each concrete Feature a matching API test file under `FeatureTests`,
including `SettingsFeatureTests.swift` in a new app. Name feature owners and
their test files with `Feature`, never the obsolete `Manager` suffix. A real
infrastructure or presentation manager such as `ThemeManager` may retain its
name and have its own tests.

When auditing quality, report separately:

- executed passed, failed, skipped and unexecuted test counts;
- behaviour/scenario coverage, distinct from line coverage;
- tests with no meaningful asserted behaviour; and
- named missing scenarios, with source evidence and why they matter.

Run focused tests and then the appropriate full suite. State target, simulator
or device, runner result and any unavailable validation honestly. Green tests
do not prove exhaustive coverage or race freedom.
