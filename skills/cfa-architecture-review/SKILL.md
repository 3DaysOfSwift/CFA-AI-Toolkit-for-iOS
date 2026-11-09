---
name: cfa-architecture-review
description: Review iOS feature ownership and CFA conformance without changing app code; also produce evidence-grounded Xcode architecture and concurrency dashboards when requested. Includes a whole-app Swift Concurrency Health Check for current or migrated apps, including non-CFA apps.
---

# CFA Architecture Review

Read the [CFA specification reading map](references/spec/README.md) to locate applicable topics. The complete CFA specification remains authoritative; use it for whole-app audits.

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

When explaining a substantive finding or answering why a rule exists, use
[decision rationale and verified learning links](references/explanations/guide.md).
Read only the relevant topic note. Explain the consequence in the user's context;
do not impose CFA on another architecture or link to an unpublished article.

For a **Concurrency Migration Health Check**, a **Frankenstein architecture** check,
or a request to assess how an Xcode project actually uses Swift Concurrency, read
[Concurrency Migration Health Check](references/concurrency-migration-health-check.md).
The Health Check reviews the whole application. If the developer explicitly
requests a narrower scope, perform a focused review and deliver scoped findings.
Assess the project's actual architecture regardless of whether it uses CFA.
Keep the Swift Concurrency correctness verdict separate from CFA conformance.
For a whole-app Health Check, run the bundled `whole-app-health.mjs` inventory.
Reconcile source files, entry points and task sites in evidence-backed operation
batches, then generate one app-specific HTML report from the validated review.
Use that workflow's checkpoint and completion check: builds, tests and simulator
launches do not complete the assessment. Finish with the whole-app verdict and report.

In a CFA conformance review, apply the screen-construction invariant to
screen-level SwiftUI Views: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from selected value data
in its initializer. Never inject or share ViewModels. Keep screen and scene
selection in presentation and follow the [detail snapshot lifetime rule](references/spec/rules/cfa-ui-03.md)
when the source data changes. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.
For existing UIKit screens, trace their actual presentation owners to Features.

Review the requested scope without refactoring the application or changing
project instructions. Missing optional themes, CFA footers or starter branding
are not architecture findings or rating deductions. Report demonstrated
accessibility/functional problems separately from design preferences.

For CFA conformance, read the [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and inspect actual source and live wiring. Trace screen state, business decisions, authoritative feature state, AppModel construction and the boundaries of any networking, storage and device microservices. Report findings with source locations, consequences and actionable recommendations. Distinguish intentional departures from defects. Do not require a type named AppModel when reviewing another architecture.

For a whole-app CFA conformance audit, apply the complete [review checklist](references/spec/topics/29-review-checklist.md)
to the actual source and live wiring. Record evidence for each applicable
requirement and a reason for each inapplicable one. A whole-app conformance
pass requires evidence for every applicable requirement. Report verified
violations and unresolved requirements separately, and state what evidence
would resolve each open requirement. For a focused review, report the scoped
findings without issuing a whole-app conformance verdict.

For independent network requests, trace each caller to transport initiation.
Look for synchronous work before the first suspension, waits on another
request, and deliberate request limits. An actor can accept another call
while an earlier download awaits its response. Establish an unintended delay
with source or timing evidence before reporting a bottleneck. Distinguish app
scheduling from URLSession connection limits and server behaviour.

Trace published snapshots from their authoritative owner to their consumers.
Check stored properties and nested references for mutation, and follow writes
through persistence to publication. A local draft or mutable value alone does
not establish a synchronization defect. For a concurrency finding, identify
the competing copy or mutation path and how it can diverge. For CFA conformance,
check the published snapshot's immutability separately.

When known paid capabilities fall within the review scope, identify their
entitlement policy and trace each identifiable entry point to its check. Report
an established unguarded call or exposure with source evidence; identify paths
that cannot be resolved as unverified. Do not assume a capability is paid from
its name, or claim a UI check provides server-side authorisation.
For scanner-assisted leads, use the [entitlement review workflow](scripts/dashboard/Documentation/entitlement-review.md).
The scanner finds candidates, not verified guards or violations; trace them and
inspect alternative entry points before recording a finding.

For a quick CFA project map, run `node scripts/dashboard/src/cfa.mjs inspect <project-folder>` from this skill's directory (add `--json` for machine-readable output). From elsewhere, use the full path to this skill's script. This read-only inspector lists screen → ViewModel → AppModel feature routes and named test files, plus lexical gaps to investigate. Check its findings against source before calling anything a defect; it does not type-check, run tests, or establish semantic conformance. Do not use its absence of findings as a review verdict. Check the CFA `viewModel` property name separately from ownership. The inspector can recognise an owned ViewModel under another name.

When the inspector flags a direct Feature dependency, trace how the caller
uses it. A genuine business workflow may coordinate Features. Verify that
the workflow has a clear owner, each shared value retains one authoritative
owner, and dependencies are free of cycles. A typed property is a lead.
Check initializer wiring and indirect calls before drawing a conclusion.

For a service-boundary finding, trace the actual caller to the networking or
storage service and confirm production target membership. Apply the
[networking rule](references/spec/rules/cfa-net-01.md) to direct URLSession
access and the [persistence rules](references/spec/topics/19-keep-persistence-behind-repository-contracts.md)
to SwiftData access. A manager declaration identifies a candidate boundary.
Confirm that the relevant requests actually go through it.

For a suspected startup storage gate, apply the
[database availability rule](references/spec/rules/cfa-launch-02.md). Trace
from AppModel construction and root presentation to the first store-opening
request. Check whether slow or failed opening can hide the root, block
unaffected navigation, or move the error out of its owning Feature. Use
existing runtime evidence or exercise a safe failure path within the agreed
review scope. A mock fetch can verify Feature recovery, while a real
store-opening and navigation check is needed to establish the launch outcome.

For a dashboard or detailed concurrency analysis, read the [dashboard workflow](references/dashboard-workflow.md). The bundled tool is at `scripts/dashboard/src/cli.mjs` relative to this skill; it requires Node.js 20+. It inventories source patterns, not semantic correctness. Only use its concurrency dashboard when the selected scope contains Swift Concurrency. If the app uses only GCD, continue a manual ownership and concurrency review; mark the dashboard unavailable rather than refusing the review or inventing zero scores.

A focused CFA review does not require an app-wide dashboard or numerical ratings. A requested full dashboard requires the complete source-evidence workflow. Do not infer testing evidence from source inspection or claim race freedom from a score.

Deliver findings and verification limits. Save the final Health Check report in `reports/health-check/` at the app repository root, outside the app target’s source directory. Keep working inventory and checkpoints outside app source. App changes, architecture adoption and concurrency migration require their own requested scope; this review does not authorize them.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
