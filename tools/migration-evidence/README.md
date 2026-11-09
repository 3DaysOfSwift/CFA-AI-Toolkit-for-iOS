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
each build in its `targets` array. Several records may cover the list. The build
linked by `buildEvidenceId` must name at least one affected target. Older
completed records need target names and renewed review. A check not run still has a planned command
and a note explaining why. Commands are text: the helper never executes them.
A `completed` record requires a pinned `repository.afterCommit` distinct from
`repository.beforeCommit`, with passed evidence at the final revision for every
completion gate entry. Link the before/after
navigator map from manual Xcode inspection, Feature and legacy primitive
inventories, hybrid review, deployment compatibility, final CFA audit, build, tests, manual behaviour
regression and human architecture review. Record an executed test or manual observation at `repository.beforeCommit`
for the behaviour baseline. If a manual baseline names targets, it must cover
at least one affected target. Compare that evidence with the final regression
checks. Use
`completionGate.deploymentCompatibilityEvidenceId` to link the minimum OS of
each affected target and the evidence that changed paths support it. The
evidence must name every affected target. Update and review older completed
records that lack the link or target coverage before validating them again. Use
`hybridReviewEvidenceId` and `finalCfaAuditEvidenceId` for the two review links.
When removing an adapter or dependency, record the consumer scenarios as
`before` evidence at `repository.beforeCommit` and record the same scenarios
rerun as `after` evidence at `repository.afterCommit`. List the affected
targets on the evidence and cite both sets of IDs in the hybrid review. If
a consumer needs every event, verify repeated equal values, delivery order
and cancellation separately from the latest state shown by the UI. If the
existing contract specifies buffering, verify what reaches a slow consumer.
The reviewer compares the scenarios and outcomes across revisions.
The final CFA audit gives each applicable requirement a verdict backed by
evidence at the final commit. Explain inapplicability and the effect of agreed
exceptions. An applicable requirement with missing evidence keeps the audit
open. Record the regression under
`completionGate.manualBehaviourRegressionEvidenceId` and name the affected
targets exercised by that regression. Record the build configuration, OS and
device or simulator in its environment. The validator rejects evidence that
names only unrelated targets or lacks target names or an environment. If evidence is missing
or failed, use `partial` and explain the gap. Validation checks the recorded
links and outcomes. The reviewer compares the declared affected targets with
the actual consumers of the changed code, checks the behaviour contract,
and verifies any affected handoff. Use the case study's behaviour table to
compare baseline and final evidence for each in-scope requirement. The
reviewer must resolve unknown outcomes and regressions before accepting
completion. The validator checks the structured evidence references and
cannot assess the behaviour described in the table. List the final-commit test or manual
evidence IDs in `completionGate.dataHandoffEvidenceIds`. Use an empty list
only when the reviewer confirms no data handoff is affected. List the
producing and receiving targets and the environment used to exercise the
handoff. Completion requires both target names and the environment. The
validator also rejects handoff evidence that names only unrelated targets. A passing build establishes compilation only. For automated test evidence,
record which affected app or extension targets the named test targets exercise.
The validator cannot infer that relationship from test target names.

For each affected system background capability, link the owning Feature and
evidence that permitted identifiers, launch registration and scheduling match
the baseline. Record controlled success, failure, expiration and expiration
racing completion. Verify cancellation and exactly-once system completion.
Record actual delivery on supported hardware separately from handler tests.

Read the warnings from both `validate` and `digest`. For a failed run during
or after migration, keep the failure record and link a passing rerun at the
final commit for the same scenario, target, build configuration and OS.
For a completed record, each failure during or after migration requires a
passing final-commit evidence entry whose `rerunOf` names the failed check. The rerun must name every target listed by the failed check. Missing or differing environment descriptions
receive a review warning because the descriptions are free text. Differing build
or test commands also trigger a warning. Verify that the new command still
exercises the failed check, and explain how the rerun resolves the failure. Check that minimum-OS evidence
lists every affected target. Navigator and human architecture reviews can
cover the whole project without a target list. When they name targets, the
validator rejects a list containing only unrelated targets. If evidence is
shared with another checkpoint, record the human architecture review and
its outcome separately within that evidence. Resolve warnings during review
and keep the migration partial while any required check remains unverified,
even when the record passes validation.

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
Evidence recorded after the review date requires a renewed review before
a new fingerprint can be accepted.
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
