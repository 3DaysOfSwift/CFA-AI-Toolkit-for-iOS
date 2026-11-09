# Historical toolkit validation

These dated records describe earlier revisions. For the current release
checks and the installed-host evaluation procedure, see the
[maintainer release procedure](PUBLISHING.md#maintainer-release-procedure).

## Codebase Tidy integration — 16 September 2026

- All 33 toolkit tests pass, including five-skill installation in a temporary destination.
- Source manifests, bundled references and standalone package validation pass.
- Local source/plugin release packaging and checksum generation pass.
- The npm script commands were executed directly with bundled Node because npm is unavailable in this environment.
- This is an unreleased local change; no remote publication or global installation was performed.

## Validation evidence — 0.2.0-beta.1

- All 33 tests passed, including four-skill standalone installation, bundled scanner
  execution, managed upgrades and refusal of conflicting legacy skill folders.
- The official plugin validator and all four skill quick validators passed.
- Generated CFA references resolve within each standalone skill; concurrency
  migration has no CFA specification dependency.
- Skill scope and reference routing were inspected. No end-to-end app creation,
  architecture adoption or GCD migration was performed in this packaging update.
- Native Codex activation and GitHub publication remain untested/unperformed.

## Earlier extraction evidence

### Validation evidence — 0.1.0-beta.1

Validated on macOS with Node.js 24.19.0 on 2026-09-15.

## Executed

- All **32 tests passed**: 23 dashboard tests and 9 distribution tests.
- Clean standalone skill installation; bundled scanner invoked from an unrelated
  working directory against the synthetic Swift fixture.
- Personal plugin marketplace staging in a temporary destination, preserving
  existing marketplace metadata and unrelated entries.
- Managed upgrade and backup creation; refusal to replace unmanaged or modified
  installations; malformed marketplace and symlink rejection.
- Tampered release detection and deterministic staged payload checks.
- Source/reference synchronisation and portable skill link checks.
- OpenAI Plugin Creator validator passed; Skill Creator quick validator passed for
  each skill. PyYAML 6.0.2 was used only for those maintainer validators and is not a
  customer dependency.

## Scope

The native Codex CLI advertises `plugin add`, but real user plugin activation and
skill discovery were not exercised: tests use disposable destinations and do not
alter the developer's installed skills. GitHub CI and the draft-release workflow
are supplied but have not run on GitHub. Node 20/22 compatibility is not established
by the local Node 24 run; CI covers the declared Node 20 minimum and newer versions.

No new iPhone application build or full legacy migration was performed as part of
this extraction. The scanner is a lexical tool; passing its tests does not prove
Swift semantic correctness, race freedom or production readiness. See PUBLISHING.md
for the remaining beta acceptance steps.
