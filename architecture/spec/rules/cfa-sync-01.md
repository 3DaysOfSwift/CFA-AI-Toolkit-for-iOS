# CFA-SPEC-SYNC-01: Choose synchronization to match the product

**Applies when:** An app requires cross-device data or offline edits.

**Strength:** Default.

**Guidance:** Do not add offline editing by default; prefer suitable system-managed sync, and use a dedicated server sync solution only when needed.

**Why:** The simplest storage strategy depends on actual product requirements.

**Example:** SwiftData with CloudKit may suit a compatible Apple-device app; a server-backed app follows its server contract.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Verify capabilities, schema, failure, retry and conflict behaviour on supported devices.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
