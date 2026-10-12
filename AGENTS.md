# iOS App Development with CFA toolkit

This is the independent CFA toolkit, not the Trend app. Maintain `architecture/cfa-specification.md`
as the canonical architecture and `tools/architecture-dashboard` as the canonical executable.
Run `node scripts/sync.mjs` to refresh generated skill dependencies. Never copy reports,
private source, absolute workstation paths or credentials into releases.

The public repository and plugin identity is iOS App Development with CFA.
Cooperative Feature Architecture (CFA) remains the architecture name. Use the
subtitle “AI skills and tools to build, modernise and maintain SwiftUI apps with
Swift Concurrency.” AppModel is the composition-root type, not the public product
name. Respect a customer's bundle prefix.

Keep seven independent workflows: app creation, CFA feature work, architecture
adoption, Legacy GCD migration, read-only architecture review, iterative CFA
codebase tidying, and CFA unit tests. Legacy GCD migration adopts CFA while
preserving product behaviour; it is not a superficial syntax rewrite. The
dashboard is a tool used by review. Preserve user intent and existing app
behaviour.

Run `npm test`, `npm run validate`, and `python3 scripts/release.py` for release changes.
All runtime dependencies must be packaged or stated as prerequisites. Test installation
in a temporary destination. Do not alter a real personal marketplace during tests.
Do not infer native host compatibility or public publication from a valid manifest.

Do not publish to a remote repository or release service without an explicit destination
and authorization. The source repository can be committed/tagged locally for preparation.
