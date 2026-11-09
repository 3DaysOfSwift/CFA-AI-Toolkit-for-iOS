# Contributing

Keep CFA easy to understand. Discuss changes to architecture principles separately
from bug fixes to the scanner or installer. Preserve the distinction between source
inventory, reviewed judgments and runtime evidence.

The canonical specification is `architecture/cfa-specification.md`. Tool source is
`tools/architecture-dashboard`. Never edit their generated skill copies directly.
Run `npm run sync`, `npm run validate`, `npm run evals` and `npm test` before
proposing a change.

For an audit scoped to guidance, skills, examples and tooling, regenerate copies
with `node scripts/sync.mjs --skip-xcode-projects`, then run
`node scripts/validate.mjs --skip-xcode-projects`. It checks source and bundled
copies while skipping starter app and Xcode template checks. For the same
scope, run the toolkit suites explicitly:

```sh
node --test test/cfa-command.test.mjs test/explanations.test.mjs \
  test/generated-target-groups.test.mjs test/ios-app-identity.test.mjs \
  test/migration-evidence.test.mjs test/migration-playground.test.mjs \
  test/spec-topics.test.mjs tools/architecture-dashboard/test/*.test.mjs
```

The distribution and orientation suites include checks that read bundled Xcode
projects. Use the full validation and test commands for release verification.
The bundled dependency copies are committed so validation can detect drift in a
source checkout.

Add regression tests for observable behaviour, especially packaging portability,
non-destructive installation and report escaping. Do not add third-party dependencies
without a concrete need. Keep examples synthetic; reports from private apps do not
belong in the repository.

Report a bug with the toolkit version, Node/host versions, minimal reproducer and
expected behaviour. Do not paste secrets or private source. Use the repository’s
security reporting facility for private vulnerability reports once hosting is enabled.

Contributions are distributed under the repository’s MIT licence. Maintainers review
changes before releases; automatic scores are not an approval decision.
