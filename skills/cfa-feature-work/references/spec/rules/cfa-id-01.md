# CFA-SPEC-ID-01: Respect project identity

**Applies when:** Creating or adapting an Xcode project.

**Strength:** Required.

**Guidance:** Follow the project identity rules and user-specified bundle identifier; never change existing identifiers merely to match an example.

**Why:** Identifiers control signing, capabilities and published app continuity.

**Example:** A new target derives its bundle identifier from the product name and requested prefix.

**Verify:** Inspect bundle identifiers across build configurations. For each newly created app target, build for a generic iOS device and verify the built Info.plist contains a resolved bundle identifier, display name, marketing version and build number. Check test target identifiers separately.

**Full rule, context and examples:** [Project Identity](../topics/06-project-identity.md). This card is a reading aid; apply the complete canonical section.
