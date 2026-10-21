# Publishing CFA AI Toolkit for iOS

## Identity

- Public product name: **CFA AI Toolkit for iOS**
- Underlying architecture: **Cooperative Feature Architecture (CFA)**
- Plugin identifier: `ios-app-development-cfa`
- Plugin display name: **CFA AI Toolkit for iOS**
- Repository slug: `CFA-AI-Toolkit-for-iOS`
- Subtitle: **AI skills and tools to build, modernise and maintain SwiftUI apps with Swift Concurrency.**
- Suggested repository topics: `swift`, `swiftui`, `ios`, `swift-concurrency`, `architecture`, `ai-assisted-development`, `mvvm`, `gcd`, `migration`, `agent-skills`.

Use the exact product name in public-facing toolkit/plugin titles, descriptions,
documentation and messages. Use CFA or Cooperative Feature Architecture (CFA)
only when referring to the architecture. Descriptive component names such as
CFA Inspector and CFA App remain valid.

Keep internal package/plugin identifiers, command names, asset filenames and
installer ownership markers stable for compatibility; they are not display
names. Clearly label any historical product names used in upgrade guidance.

Keep the architecture name stable, but lead with the work the toolkit helps
developers do. Use AI, SwiftUI and Swift Concurrency naturally in page titles,
descriptions and examples. This is descriptive positioning, not a promise of
search ranking. CFA is an architectural method, not an AI runtime.

## What is ready locally

The source, plugin manifest, eight self-contained skills, scanner, tests, installer,
MIT licence and reproducible ZIP builder live together in this repository. The
scanner has no npm dependencies. The skills include their own references and tools.
No Trend checkout is required. Download users need Node.js 20+; maintainers also
need Python 3. Compatible Codex installation requires `codex plugin add` support.

## Maintainer release procedure

1. Update the version in `package.json`, `.codex-plugin/plugin.json` and
   `tools/architecture-dashboard/package.json`. Update the changelog.
2. Run `node scripts/sync.mjs`, `npm test`, and `npm run validate`.
3. Run `python3 scripts/release.py --out dist/VERSION` with a fresh directory.
   It repeats validation and tests, then builds plugin and source ZIPs and SHA256SUMS.
4. Extract the plugin ZIP into a clean directory. Follow INSTALLATION.md to test
   standalone installation and plugin staging in a disposable destination.
5. On a supported test account, install through Codex and run each skill in a new
   conversation. Verify both discovery and actual execution. Staging alone is not
   evidence of native activation. Test migration against an app with a known build
   and behaviour baseline before advertising migration compatibility.
6. Commit source and tag the matching version, for example `v0.1.0-beta.1`.
7. Once a GitHub owner/repository is selected, add the remote and push the source
   and tag. The included manual Release workflow builds a **draft** GitHub release.
   Review its assets and notes before publishing it. The draft workflow must exist
   on the default branch before it can be dispatched.

The prepared local repository does not create a GitHub repository or publish a
release. No hosted download URL is fabricated. A maintainer must choose the public
destination and perform the publication step.

## Customer delivery

Publish the plugin ZIP, source ZIP and SHA256SUMS together. Link to the plugin ZIP
from training pages and the repository README. Customers extract and run
`node scripts/install.mjs` (or `Install.command` on macOS). This registers the plugin
in their personal marketplace, then asks the installed Codex CLI to activate it.
A checksum detects corruption; without signing or a trusted delivery channel it
does not prove publisher identity. This beta does not ship a signed macOS package.

Keep code, skills and the specification publicly accessible under MIT. Paid training
can provide guided migration, explanations, exercises and worked commercial examples.
The same public toolkit can accompany the paid course without a separate paid fork.

## Before removing the beta label

Record a native installation on each supported host version, realistic new-app and
legacy migration trials, and dashboard output review. Establish issue handling and
compatibility expectations. The present automated suite verifies packaging and
scanner behaviour; it does not establish the correctness of every generated app.
