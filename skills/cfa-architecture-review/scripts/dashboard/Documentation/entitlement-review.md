# Review paid capability entry points

Use this workflow when product requirements identify paid capabilities. It
helps locate written calls for a reviewer to trace; it does not determine
whether a call is guarded or find every possible entry point.

From the architecture review skill folder, generate a new analysis outside the
application source (the optional compiler index and module are described in
`scripts/dashboard/src/project-analysis.mjs`):

```sh
node scripts/dashboard/src/project-analysis.mjs /path/to/project --out /tmp/project-analysis.json
```

Create a local JSON policy with the capability names and exact call expressions
as they appear in the project's source. Choose the spellings from product
requirements and source inspection; these are not inferred from type names.

```json
{
  "capabilities": [
    { "name": "Export", "writtenCalls": ["exportFeature.export", "feature.export"] }
  ]
}
```

Run:

```sh
node scripts/dashboard/src/entitlement-audit.mjs --analysis /tmp/project-analysis.json --policy /tmp/paid-capabilities.json --out /tmp/entitlement-review.json
```

Inspect every candidate and any indexed caller leads, verify the source revision,
and trace the actual entry point and entitlement check. Review presentation
separately: a screen can expose paid data or controls without making a call
listed in the policy. Trace alternate screens and other callers, and test
locked and entitled outcomes for both exposure and execution. Matching source text is not a
resolved call, a verified guard, or proof of a violation; the compiler index is
build-specific and its freshness is unverified. Aliases, external code,
dynamic dispatch and omitted spellings can escape this scan. If the syntax
inventory is unavailable or a path cannot be resolved, record it as unverified;
zero matches do not constitute a pass. Enforce protected server actions on the
server independently of any UI check.
