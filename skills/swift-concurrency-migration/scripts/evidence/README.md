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
date, outcome and evidence reference. A check not run still has a planned command
and a note explaining why. Commands are text: the helper never executes them.
`completed` requires recorded passing after-build and after-test results at the
resulting commit, but does not prove behaviour preservation. Human review must
also examine the actual behaviour contract and its coverage.

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
