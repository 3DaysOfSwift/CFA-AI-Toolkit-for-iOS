# CFA-SPEC-SNAPSHOT-01: Publish immutable domain snapshots

**Applies when:** Exposing API or persistence data as domain values.

**Strength:** Required.

**Guidance:** Use let properties for published snapshot structs and construct replacement values after confirmed changes.

**Why:** A copy should not diverge by being mutated as though it were authoritative.

**Example:** A new launch value replaces an earlier snapshot after a successful refresh.

**Verify:** Inspect published value types and ensure callers use Feature commands to change durable data.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
