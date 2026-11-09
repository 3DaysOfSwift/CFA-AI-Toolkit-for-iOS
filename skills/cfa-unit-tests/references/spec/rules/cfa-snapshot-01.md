# CFA-SPEC-SNAPSHOT-01: Publish immutable domain snapshots

**Applies when:** Exposing API or persistence data as domain values.

**Strength:** Required.

**Guidance:** Use `let` properties and immutable contents for published snapshot structs. Exclude mutable reference state that could change a snapshot in place. Submit changes through the owning Feature and publish replacement values after confirmation.

**Why:** A copy should not diverge by being mutated as though it were authoritative.

**Example:** See the immutable RocketLaunch and nested value types in [Next Rocket Launch](../examples/open-source-apps.md#open-source-ios-apps). The [Notes example](../examples/README.md#notes-reference-feature) shows a confirmed write publishing a new Note.

**Verify:** Inspect stored properties and nested values for mutable references. Trace durable changes through Feature commands and verify that a failed write leaves the published snapshot intact.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
