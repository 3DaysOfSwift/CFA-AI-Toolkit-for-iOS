# CFA-SPEC-SNAPSHOT-01: Publish immutable domain snapshots

**Applies when:** Exposing API or persistence data as domain values.

**Strength:** Required.

**Guidance:** Use `let` properties and immutable contents for published snapshot structs. Exclude mutable reference state that could change a snapshot in place. A let property holding a mutable class instance or a collection of mutable objects still exposes changing data. Keep editable drafts separate from the published snapshot. Submit edits through the owning Feature and publish replacement values after authoritative persistence succeeds. For a current server response, publish the new snapshot independently of any optional local cache write.

**Why:** A copy should not diverge by being mutated as though it were authoritative.

**Example:** See the immutable RocketLaunch and nested value types in [Next Rocket Launch](../examples/open-source-apps.md#open-source-ios-apps). The [Notes example](../examples/README.md#notes-reference-feature) shows a confirmed write publishing a new Note.

**Verify:** Check that each stored snapshot property is declared with `let`. Inspect nested values and collection elements for references that can change in place. Where snapshots cross isolation boundaries, verify that the storage service returns immutable Sendable domain values. Trace durable changes through the owning Feature. Verify that a failed write leaves the existing snapshot intact and that a successful write publishes a replacement without changing an earlier snapshot held by a reader.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
