# CFA-SPEC-PREF-01: Restore safe defaults for obsolete preferences

**Applies when:** Restoring a non-critical preference.

**Strength:** Default.

**Guidance:** Use a product-defined safe fallback for a missing or obsolete recognized value; distinguish storage corruption and failed writes.

**Why:** An old theme should not force the user to solve an internal compatibility issue.

**Example:** An unavailable saved colour theme falls back to system appearance.

**Explanation:** [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures).

**Verify:** Test a known preference, an obsolete value and a genuine storage error.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
