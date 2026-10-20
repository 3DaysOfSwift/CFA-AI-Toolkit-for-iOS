# CFA AI Toolkit for iOS — v0.3.0

This release brings the downloadable package up to date with the toolkit described in the README. The previous `v0.2.0-beta.2` download had four skills; this one includes all eight, the `cfa` Terminal command, and the native **CFA App** Xcode project template.

## Included

- Eight AI skills: CFA App Creation, CFA Feature Work, CFA Architecture Adoption, Legacy GCD Migration, CFA Architecture Review, CFA Codebase Tidy, CFA Unit Tests, and Swift Code Quality.
- The `cfa` command: `inspect`, `dashboard`, `doctor`, and `enable-project`.
- The **CFA App** Xcode template and its separate installer, `Install Xcode Template.command`.
- A local architecture inspector and evidence-linked dashboard bundled with the review skill.

Feature-owning concrete types now use a `Feature` suffix, with matching AppModel and ViewModel names. The template and AI guidance follow that rule. This release does **not** automatically rename code in existing apps.

## Download and install

For Codex, download **`ios-app-development-cfa-0.3.0-plugin.zip`**, extract it, then run `Install.command` on macOS or `node scripts/install.mjs` in Terminal. Restart Codex or open a new conversation after installation. Existing managed installations can be upgraded with `node scripts/install.mjs --replace`; the installer retains a backup and refuses to overwrite edited or unrelated files.

To add the Xcode template, run **`Install Xcode Template.command`** from the extracted release, then restart Xcode. The template is not installed automatically with the AI skills.

The source ZIP is for contributors. `SHA256SUMS` contains checksums for both archives. See the [installation guide](INSTALLATION.md) for requirements, alternate skill hosts, upgrades, and troubleshooting.

## Validation and limits

The automated suite checks packaging, installation safeguards, the `cfa` command, inspector, dashboard, and template structure. The tools report evidence for review; they do not certify an app as race-free or production-ready. Building and exercising an AI-generated app still requires Xcode, relevant tests, and human review.

Created by [3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/) and released under the MIT licence.
