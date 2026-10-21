# CFA AI Toolkit for iOS — v0.2.0-beta.2

Historical release: originally published under the product name
“Cooperative Feature Architecture”. The current product name is CFA AI Toolkit
for iOS; Cooperative Feature Architecture (CFA) remains the architecture name.

A free, open-source toolkit from [3DaysOfSwiftConcurrency.com](https://www.3daysofswiftconcurrency.com/) for iOS developers building applications with an AI copilot.

CFA gives developers and coding agents a shared structure for feature ownership, dependencies and Swift Concurrency. Use it to create an app, adopt CFA in an existing codebase, migrate legacy GCD code or review an implementation.

## Included

1. **CFA App Creation** — create a new Xcode project with a working CFA feature.
2. **CFA Architecture Adoption** — restructure existing code while preserving behaviour.
3. **Swift Concurrency Migration** — replace GCD and callbacks while preserving the app’s existing architecture and concurrency requirements.
4. **CFA Architecture Review** — inspect feature ownership and concurrency without changing app code.

**One tool: Xcode Project Dashboard**, bundled with the review skill for local, source-linked reports. Each skill includes the references and dependencies it needs.

## What changed

This release includes the revised README with a concise CFA introduction, numbered installation instructions, practical prompts for each skill, publisher branding and repository links. It uses the smaller publisher logo and removes superseded artwork. Skill and dashboard behaviour are unchanged from beta.1.

## Download and install

- **Most users:** download the file ending in **`-plugin.zip`**.
- **Toolkit contributors:** download the file ending in **`-source.zip`**.
- **SHA256SUMS:** checksums for verifying the two archives.

Extract the plugin ZIP, open Terminal in its extracted folder and run:

```sh
node scripts/install.mjs
```

On macOS, you can also open `Install.command`. Open a new Codex conversation after installation.

Requires **Node.js 20+** and a compatible Codex CLI supporting `codex plugin add`. Building iPhone apps requires macOS and Xcode. For standalone skill installation, use `node scripts/install.mjs --mode skills` and check your agent’s discovery requirements. Read the bundled installation guide before upgrading an existing installation.

## Beta status

All **33 automated tests pass**, and the plugin and four skills pass their structure validators. Native Codex activation and end-to-end app creation/migration trials remain unverified. Dashboard findings need source review; scores do not certify production readiness or race freedom.

## Publisher and licence

Created and published by **3 Days of Swift Concurrency** as a gift to the iOS development community. Explore the training at [3DaysOfSwiftConcurrency.com](https://www.3daysofswiftconcurrency.com/).

**MIT licensed.** Free to use in personal and commercial projects; no course purchase is required. Copyright © 2026 3 Days of Swift Concurrency. Retain the copyright and licence notices when redistributing copies or substantial portions.
