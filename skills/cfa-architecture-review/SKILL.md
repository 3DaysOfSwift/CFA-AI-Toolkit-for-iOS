---
name: cfa-architecture-review
description: Review iOS feature ownership and CFA conformance without changing app code; also produce evidence-grounded Xcode architecture and concurrency dashboards when requested. Includes a Concurrency Migration Health Check for conflicting ownership and coordination after migration; works with legacy and non-CFA apps.
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
This mode reviews the whole application by default; use a narrower scope only
when explicitly requested. It reviews the project's actual architecture without
requiring CFA or a dashboard. Keep its correctness verdict separate from CFA conformance.
Run the bundled `whole-app-health.mjs` inventory and reconcile the full source and entry points in evidence-backed operation batches as described in that workflow, then generate the single
app-specific Health Check HTML report using its validated review input.
Use that workflow's checkpoint and completion check: builds, tests and simulator
launches do not complete the assessment; finish with its scoped verdict and report.

Apply the specification's screen-construction invariant within a CFA conformance review's requested
scope: a private `viewModel` property with inline `@State` construction by default.
A detail View may construct its own State-backed ViewModel from selected value data
in its initializer. Never inject or share ViewModels; keep screen and scene navigation selections
out of Features. Review-only work
reports violations; tests inject Features into ViewModels, not ViewModels into Views.

Review the requested scope without refactoring the application or changing
project instructions. Missing optional themes, CFA footers or starter branding
are not architecture findings or rating deductions. Report demonstrated
accessibility/functional problems separately from design preferences.

For CFA conformance, read the [CFA specification](references/cfa-specification.md), [CFA change gate](references/cfa-change-gate.md) and inspect actual source and live wiring. Trace screen state, business decisions, authoritative feature state, AppModel construction and repository boundaries. Report findings with source locations, consequences and actionable recommendations. Distinguish intentional departures from defects. Do not require a type named AppModel when reviewing another architecture.

When known paid capabilities fall within the review scope, identify their
entitlement policy and trace each identifiable entry point to its check. Report
an established unguarded call or exposure with source evidence; identify paths
that cannot be resolved as unverified. Do not assume a capability is paid from
its name, or claim a UI check provides server-side authorisation.
For scanner-assisted leads, use the [entitlement review workflow](scripts/dashboard/Documentation/entitlement-review.md).
The scanner finds candidates, not verified guards or violations; trace them and
inspect alternative entry points before recording a finding.

For a quick CFA project map, run `node scripts/dashboard/src/cfa.mjs inspect <project-folder>` from this skill's directory (add `--json` for machine-readable output). From elsewhere, use the full path to this skill's script. This read-only inspector lists screen → ViewModel → AppModel feature routes and named test files, plus lexical gaps to investigate. Check its findings against source before calling anything a defect; it does not type-check, run tests, or establish semantic conformance. Do not use its absence of findings as a review verdict. Check the CFA `viewModel` property name separately from ownership. The inspector can recognise an owned ViewModel under another name.

For a dashboard or detailed concurrency analysis, read the [dashboard workflow](references/dashboard-workflow.md). The bundled tool is at `scripts/dashboard/src/cli.mjs` relative to this skill; it requires Node.js 20+. It inventories source patterns, not semantic correctness. Only use its concurrency dashboard when the selected scope contains Swift Concurrency. If the app uses only GCD, continue a manual ownership and concurrency review; mark the dashboard unavailable rather than refusing the review or inventing zero scores.

A focused CFA review does not require an app-wide dashboard or numerical ratings. A requested full dashboard requires the complete source-evidence workflow. Do not infer testing evidence from source inspection or claim race freedom from a score.

Deliver findings and verification limits. Save the final Health Check report in `reports/health-check/` at the app repository root, outside the app target’s source directory. Keep working inventory and checkpoints outside app source. App changes, architecture adoption and concurrency migration require their own requested scope; this review does not authorize them.

## Shared Swift coding standards

Read the [Swift coding guide](references/swift-coding-guide.md) before implementing or reviewing Swift. Apply its rules for crash safety, shared model decisions, declarative Views, KISS, errors, concurrency, responsiveness and verification within this workflow's authorized scope. Treat forced operations as explicit crash decisions; never infer permission to retain them merely because they appear safe. Read-only reviews report violations rather than editing code.
