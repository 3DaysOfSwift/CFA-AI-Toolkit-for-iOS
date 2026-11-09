# CFA migration evidence — first increment

Local capture and validation for opt-in migration case studies. This is not a
model-training pipeline, automatic collector, publisher or retrieval service.
No real migration case is included. Node.js 20+; no packages to install.

## Start a case

Choose an existing parent folder outside the app checkout, then run:

```sh
node evidence.mjs init /path/to/evidence/serial-writes \
  --project /path/to/app \
  --id serial-writes --migration-id example-app-migration --date 2026-10-25
```

From the toolkit source, the executable is `tools/migration-evidence/evidence.mjs`.
In the installed migration skill it is `scripts/evidence/evidence.mjs`, relative
to that skill's folder. These commands work from any working directory when an
absolute executable path is supplied. Paths above are examples, not defaults.
The date is the team's actual local capture date. Use `--synthetic` only for
explicitly fictional exercises. Never label a synthetic scenario as real.

The helper creates just `record.json` and `case-study.md`. Existing destinations
are never overwritten; the app checkout is never read or changed. The raw
template has an intentionally placeholder date; use init to set the real date.
The scaffold is an incomplete but valid draft. Null means unknown, not verified.

## Record evidence

Edit the two files and add minimal, redacted evidence attachments inside the
case folder. References are folder-relative files or credential-free HTTPS URLs
without query parameters; no traversal, absolute file paths or symlinks. Use
commit-specific URLs for remote source/diffs. URLs are not fetched, so access and
immutability require human verification. Local files are limited to 8 MB each.

The [schema](schema.json) defines the controlled vocabulary. `migrationId` groups
scenarios from one migration; `id` identifies a scenario. `revision` starts at 1.
Baseline and resulting commit fields accept full Git object IDs, not branch names.
Evidence IDs connect corrections to the observations supporting them. Evidence
kind `license` can point to a local license/notice file or an immutable license URL.
Use scope.constraints or the case study for selection rationale and applicability.

Before/after build and test entries include their command, environment, commit,
date, outcome and evidence reference. For completion, list every affected
target in `completionGate.affectedTargets` and identify the targets covered by
each build in its `targets` array. Several records may cover the list. Older
completed records need target names and renewed review. A check not run still has a planned command
and a note explaining why. Commands are text: the helper never executes them.
A `completed` record requires a pinned `repository.afterCommit` and passed
evidence at that revision for every completion gate entry. Link the before/after
navigator map from manual Xcode inspection, Feature and legacy primitive
inventories, hybrid review, deployment compatibility, final CFA audit, build, tests, manual behaviour
regression and human architecture review. Use
`completionGate.deploymentCompatibilityEvidenceId` to link the minimum OS of
each affected target and the evidence that changed paths support it. Older
completed records need this link and a fresh review before they validate. Use
`hybridReviewEvidenceId` and `finalCfaAuditEvidenceId` for the two review links.
When removing an adapter or dependency, record the consumer scenarios as
`before` evidence at `repository.beforeCommit` and record the same scenarios
rerun as `after` evidence at `repository.afterCommit`. List the affected
targets on the evidence and cite both sets of IDs in the hybrid review.
The reviewer compares the scenarios and outcomes across revisions.
The final CFA audit gives each applicable requirement a verdict backed by
evidence at the final commit. Explain inapplicability and the effect of agreed
exceptions. An applicable requirement with missing evidence keeps the audit
open. Record the regression under
`completionGate.manualBehaviourRegressionEvidenceId` and name the affected
targets exercised by that regression. The validator rejects evidence that
names only unrelated targets and flags older evidence without target names
for review. If evidence is missing
or failed, use `partial` and explain the gap. Validation checks the recorded
links and outcomes. The reviewer compares the declared affected targets with
the actual consumers of the changed code, checks the behaviour contract,
and verifies any affected handoff. List the final-commit test or manual
evidence IDs in `completionGate.dataHandoffEvidenceIds`. Use an empty list
only when the reviewer confirms no data handoff is affected. List the
producing and receiving targets and the environment used to exercise the
handoff. A passing build establishes compilation only.

Read the warnings from both `validate` and `digest`. For a failed run during
or after migration, keep the failure record and link a passing rerun at the
final commit for the same scenario, target, build configuration and OS.
Explain how the rerun resolves the failure. Check that minimum-OS evidence
lists every affected target. If evidence is shared with another checkpoint,
confirm that it explicitly records the human architecture review and its
outcome. The validator checks evidence links and reports warnings. The
reviewer resolves them and keeps the migration partial while any required
check remains unverified.

## Validate and review

```sh
node evidence.mjs validate /path/to/evidence/serial-writes/record.json
node evidence.mjs digest /path/to/evidence/serial-writes/record.json
node evidence.mjs validate /path/to/evidence/serial-writes/record.json --publish
```

Validation exits nonzero on malformed records, unsafe/missing local references
or failed review gates. Dates must be real calendar dates. Unknown tags/fields
are rejected, so taxonomy changes need a schema revision rather than ad hoc tags.
The bundled validator implements only this schema's keyword subset and rejects
unsupported keywords; it is not a general JSON Schema implementation.

Workflow: draft → reviewed → approved, or superseded. Review is a human process,
not a CLI action. Set the reviewer metadata and desired status after actual
review, run digest, and copy the printed fingerprint into review.digest. A change
to any record field or referenced local content invalidates that fingerprint.
The digest command is read-only and does not approve anything. Record.json key
ordering and whitespace do not affect the fingerprint. Local evidence bytes do.
Failed migrations can be approved as lessons when their failures and limits are
explicit. Do not fabricate a successful result to pass validation.

`--publish` only checks eligibility. It neither publishes nor exports files. It
requires a real, approved, development case, redistribution permission, license
evidence and privacy clearance. It rejects synthetic/holdout/superseded records.
The check cannot prove legal rights, reviewer identity, truth or concurrency
safety. Do not release whole evidence folders: unrelated attachments have not
been assessed. No sensitive-data scanner is provided; reviewers must inspect
record fields, case-study prose and all attachments before approving reuse.

## Synthetic exercise and next steps

[The fictional serial-writes case](examples/synthetic-serial-writes/record.json)
exercises a realistic shape without claiming a migration, test run or human
correction occurred. It is a draft and is never eligible for publication.

First capture two real scenarios and review the format. Retrieval, a pinned
approved-case catalogue, cross-record checks (unique IDs, supersession and
repository-level holdout isolation), release manifests and baseline-versus-case
evaluation are subsequent increments. Neither this helper nor the migration
skill currently claims to retrieve approved precedents automatically.
