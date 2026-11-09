# CFA-SPEC-SYNC-01: Choose synchronization to match the product

**Applies when:** An app requires cross-device data or offline edits.

**Strength:** Default storage approach with required save and sync guarantees when applicable.

**Guidance:** Add offline editing or cross-device sync only when the product needs it. For compatible Apple-device data, consider SwiftData with CloudKit or iCloud documents according to the data format. Keep live SwiftData stores out of iCloud Drive. Apple-managed sync may be delayed, and local storage errors still need handling. For a custom server, follow its sync contract and use a dedicated sync service when needed. If that workflow supports offline edits, persist the edit and pending-sync metadata together before reporting local success. Report server confirmation separately. Preserve pending changes across failures and restarts, make retries safe against duplication, and define conflict and rejection outcomes with the developer. Decide how to resolve conflicting offline edits even with Apple-managed sync. A latest version may suit a preference, while user-created work may need both versions preserved or a user choice.

**Why:** The simplest storage strategy depends on actual product requirements.

**Example:** SwiftData with CloudKit may suit a compatible Apple-device app; a server-backed app follows its server contract.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** For custom sync, fail the local write and verify that neither local success nor a sendable pending edit is published. After a successful local save, fail sync, restart and retry with the same edit identity to verify one logical server change. When replacing a sync implementation, verify recovery and retry of an edit persisted by the previous version. Exercise conflict and rejection outcomes where applicable. Verify Apple-managed sync, including conflicting offline edits, on supported devices with the required capabilities, account and schema.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
