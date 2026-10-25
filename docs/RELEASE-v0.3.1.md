# CFA AI Toolkit for iOS — v0.3.1

Capture the reasoning behind a migration, not just its final code. This release
adds opt-in infrastructure for turning real migration work into reviewed case
studies, alongside the template and workflow improvements committed since v0.3.0.

## Migration evidence: the first increment

When explicitly requested, the migration skill can record the original behaviour,
constraints, decisions, alternatives, human corrections and actual verification.
Working evidence stays outside the application repository and toolkit release
source; ordinary migrations do not acquire extra case-study files.

- A versioned record schema and readable case-study template.
- A local Node.js helper to create drafts, validate evidence and fingerprint reviews.
- Separate labels for general Swift Concurrency guidance and CFA-specific choices.
- Publication-eligibility checks excluding drafts, synthetic cases, holdouts and
  records without redistribution approval or privacy clearance.
- Self-contained tooling bundled with the migration skill, including a clearly
  fictional example for exercising the format.

This is **capture infrastructure**, not an automatically trained model, approved
case catalogue or retrieval service. No real migration records are included.
Validation does not establish factual correctness, legal permission or concurrency
safety. The helper does not upload evidence, fetch references or execute recorded
commands. Review and publication remain explicit decisions.

## Other improvements since v0.3.0

- **Habit Tracker** and **Day Streak** native Xcode templates, plus editable
  project blueprints. Day Streak uses Todays Twenty as its daily-practice example.
- A separate **Habit Tracker Pro** project demonstrating Swift Charts and a
  one-time StoreKit unlock for Trends.
- Stronger feature ownership, Settings/test pairing, AppModel composition,
  lifecycle, task ownership and feature-owned persistence guidance.
- New-product design defaults separated from maintenance and migration rules.
  Existing apps retain their approved UI and branding; the toolkit does not
  repeatedly propose themes, footers or starter artwork during ordinary upkeep.

## Download and install

Download **ios-app-development-cfa-0.3.1-plugin.zip**, extract it, then run
`Install.command` on macOS or `node scripts/install.mjs` in Terminal. Existing
managed installations can use `node scripts/install.mjs --replace`; the installer
keeps a backup and refuses to overwrite edited or unrelated files. Open a new
Codex conversation after installation.

The AI tools require Node.js 20+. No npm dependencies or PyYAML are needed.
Install Xcode templates separately using `Install Xcode Template.command`.
The source ZIP is for contributors; `SHA256SUMS` covers both download archives.

## Verification and limits

The release source passes 80 automated tests, including 15 new evidence tests,
plus toolkit/reference validation. Portable installation tests run the bundled
helper outside the source checkout. Tests cover unsafe paths, missing evidence,
changed review content, invalid approval states and non-execution of recorded
commands. Release archives are checked in an isolated environment.

These checks do not replace Xcode builds, runtime behaviour tests or human review
of an individual migration. No ten-project migration benchmark or retrieval
effectiveness claim is made. A new native Codex activation and end-to-end exercise
of every skill is not part of this release's automated verification.

Created by [3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/).
The toolkit is released under the MIT licence; third-party migration material
requires its own provenance and permitted-use review.
