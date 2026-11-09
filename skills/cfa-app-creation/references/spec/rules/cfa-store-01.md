# CFA-SPEC-STORE-01: Publish durable edits after saving

**Applies when:** Saving a user edit or other durable command.

**Strength:** Required.

**Guidance:** Publish confirmed saved state only after required authoritative persistence succeeds. Preserve input on failure. For simple preferences, update `UserDefaults` before publishing the value. The setter does not confirm a disk write. Use a storage API that reports the write outcome when the product requires confirmed persistence.

**Why:** The UI must not claim that an unsaved change was saved.

**Example:** In the bundled Habit Tracker, a failed count save leaves confirmed progress unchanged and TodayViewModel retains the entered value for retry.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Inject failed and successful writes; check state and retry behaviour.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
