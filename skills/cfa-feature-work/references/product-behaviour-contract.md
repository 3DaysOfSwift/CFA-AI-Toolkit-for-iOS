# Product Behaviour Contract

Use this contract during a legacy migration to preserve what the application
does while changing how it is structured and executed. The contract converts
scattered evidence into readable product requirements and makes behavioural
differences visible to developers, reviewers, and the testing team.

Preserve the app's business outcomes and user-facing capabilities, not every
legacy implementation detail. Moving to CFA and Swift Concurrency is the scope;
do not seek unrelated modernisation. Migration may require replacing deprecated
components; minor platform-driven presentation differences
are acceptable when the intended journey remains intact. Preserve the existing
design where practical rather than introducing an unrelated redesign. Identify
and fix confirmed defects within the migration scope, test the intended result,
and explain the change. Resolve ambiguous or materially different product
behaviour with the developer instead of guessing.

## Build the Evidence Inventory

Inspect the live codebase and available product material before changing
production code:

- unit, integration, UI, and snapshot tests;
- test plans and manual regression cases;
- acceptance criteria and documented user journeys;
- storage, networking, notification, and background-work behaviour;
- error, empty, retry, cancellation, and interrupted-lifecycle paths; and
- reliable support or analytics evidence when it describes observable product
  behaviour.

Run the existing test suite and record which tests pass, fail, or cannot run in
the baseline environment. A pre-existing failure is evidence to investigate,
not permission to ignore the covered behaviour.

## Translate Evidence into Requirements

Create `MIGRATION_BEHAVIOUR_CONTRACT.md` in the private working evidence folder
outside the application repository and toolkit release source. Place a reviewed
copy in the application repository only when the developer requests it. Give each
requirement a stable identifier such as `BEH-001` and express it as one
plain-English sentence describing an externally observable result.

Prefer:

> When a saved weight entry is deleted, it no longer appears in History and the
> projection is recalculated from the remaining entries.

Avoid:

> `deleteEntry()` calls `refreshSnapshot()`.

The first describes product behaviour. The second merely repeats the current
implementation and would prevent a safe redesign.

One test may establish several requirements, and several tests or manual flows
may support one requirement. Do not force a one-to-one mapping.

Use this table as the maintained contract:

| ID | Plain-English requirement | Legacy evidence | Evidence status | Baseline | Replacement protection | Post-migration result | Manual regression | Difference and approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | When… | Test file, test name, test case, or observed flow | Confirmed | Pass | New test name | Pass | Tester, date, result | None |

Use one of these evidence statuses:

- **Confirmed:** explicit product material or trustworthy tests establish the
  requirement.
- **Inferred:** behaviour is observable, but intent has not been confirmed.
- **Conflicting:** available sources disagree and a product decision is needed.
- **Unprotected:** the requirement is known but has no reliable automated test.
- **Obsolete candidate:** behaviour appears unwanted; investigate the intended
  outcome before removing a user-facing capability.

Do not silently resolve conflicting evidence or convert an apparent legacy bug
into a new requirement. Record the uncertainty and seek the appropriate product
decision.

## Establish Protection Before Moving Code

Add focused characterisation tests for important confirmed or inferred
behaviour that lacks reliable automated protection. Prioritise destructive
actions, persistence, purchases, authentication, calculations, ordering,
concurrency, cancellation, background work, and recovery from failure.

A characterisation test records current observable behaviour; it does not
declare that behaviour ideal. Keep its corresponding contract status accurate.

When replacement tests are introduced, make them prove the same plain-English
requirement rather than reproduce the legacy implementation. Keep legacy and
replacement protection running together where practical. Remove legacy tests
only after equivalent requirement coverage has been demonstrated and recorded.

## Compare Every Migration Pass

After each migration pass:

1. Build every affected target.
2. Run the baseline regression suite and the new tests.
3. Update the evidence for every affected requirement.
4. Exercise high-risk affected flows manually when the automated evidence is
   insufficient.
5. Investigate and classify every difference before proceeding.

Classify a difference as exactly one of:

- **Regression:** the replacement violates the preserved requirement.
- **Intended product change:** product behaviour was deliberately changed by
  an authorised decision recorded in the contract.
- **Confirmed defect corrected:** a verified defect was fixed within scope;
  record the evidence, intended outcome, correction and regression test.
- **Platform-driven presentation change:** a modern or replacement system
  component differs in minor details while preserving the intended journey;
  record the difference and verify the interaction.
- **Environment or flaky evidence:** the difference is caused by the test
  environment or unreliable evidence and includes a recorded investigation.
- **Unknown:** the cause or intended behaviour has not been established.

A regression or unknown difference blocks completion of the current pass.
Architecture cleanliness is never sufficient justification for changing
behaviour.

## Require Manual Regression

Automated tests cannot capture every interaction, visual transition, system
integration, timing condition, or undocumented expectation. The testing team
must run the agreed manual regression suite after the architecture milestone
and again after the Legacy GCD migration. Include real-device and
critical integration testing when the product requires it.

Record the tester, date, build, environment, result, and any linked defect for
each manual requirement. Manual testing complements the contract; it must not
be represented as an informal assurance that leaves no evidence.

## Completion Gate

The behavioural migration is complete only when:

- every in-scope requirement has baseline and post-migration evidence;
- all previously passing regression tests and replacement tests pass;
- no difference remains classified as regression or unknown;
- confirmed in-scope defect fixes and platform-driven differences have evidence
  and verification, and materially changed product decisions have authorisation;
  and
- the required manual regression runs have passed and been recorded.

This process is deliberately not infallible. It provides a disciplined way to
find the eggs broken during migration, identify why they broke, and prevent them
from being hidden by a successful build or an attractive new architecture.
