# CFA-SPEC-SYNC-01: Choose synchronization to match the product

**Applies when:** An app requires cross-device data or offline edits.

**Strength:** Default.

**Guidance:** Add offline editing or cross-device sync only when the product needs it. Prefer suitable system-managed sync and follow the app’s server contract when it has one. For offline edits, persist the edit and pending-sync metadata together before reporting local success. Track server confirmation separately and define conflict handling and safe retries.

**Why:** The simplest storage strategy depends on actual product requirements.

**Example:** SwiftData with CloudKit may suit a compatible Apple-device app; a server-backed app follows its server contract.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Verify capabilities and schema on supported devices. Check that pending edits survive restarts, retries do not duplicate changes, and conflicts and rejections follow product policy.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
