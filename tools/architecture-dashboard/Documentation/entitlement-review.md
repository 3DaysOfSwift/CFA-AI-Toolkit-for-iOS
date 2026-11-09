# Review paid capability entry points

Use this workflow when product requirements identify paid capabilities. It
helps locate written calls for a reviewer to trace; it does not determine
whether a call is guarded or find every possible entry point.

Run the commands from the dashboard folder. In the toolkit checkout, that is
`tools/architecture-dashboard`. In an installed architecture review skill, it
is `scripts/dashboard` inside the skill folder.

Generate an analysis outside the application source. To include compiler-index
caller leads, pass both `--index-store <path>` and `--module <name>` for the
intended build.

```sh
node src/project-analysis.mjs /path/to/project --out /tmp/project-analysis.json
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
node src/entitlement-audit.mjs --analysis /tmp/project-analysis.json --policy /tmp/paid-capabilities.json --out /tmp/entitlement-review.json
```

Inspect every candidate and any indexed caller leads, verify the source revision,
and trace the actual entry point and entitlement check. Review presentation
separately: a screen can expose paid data or controls without making a call
listed in the policy. Trace alternate screens and other callers, including
deep links, notification actions, and additional targets when they reach the
capability. Check that the
ViewModel reads current entitlement from `PurchasesFeature` before presenting
or invoking the paid capability. Exercise locked and entitled outcomes for both
exposure and execution on the relevant routes. Keep pricing and entitlement
checks outside the capability Feature so its behaviour can be reused when the
pricing policy changes. For a confirmed unguarded path,
cite the entry point and the paid call or exposure and describe the consequence.
Matching source text alone does not resolve the call or establish a guard or
violation. Syntax and index records are matched by source line. If several calls occur on
one line, verify which enclosing symbol belongs to the paid call before
following its callers. The compiler index is build-specific and its freshness
is unverified. Aliases, external code,
dynamic dispatch and omitted spellings can escape this scan. If the syntax
inventory is unavailable or a path cannot be resolved, record it as unverified;
zero matches do not constitute a pass. Enforce protected server actions on the
server independently of any UI check.
