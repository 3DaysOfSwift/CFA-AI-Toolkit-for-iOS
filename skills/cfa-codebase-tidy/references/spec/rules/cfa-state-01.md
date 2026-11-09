# CFA-SPEC-STATE-01: Keep one authoritative Feature owner

**Applies when:** Managing shared application state.

**Strength:** Required.

**Guidance:** A single MainActor Feature owns each piece of authoritative shared application state; lower services may own implementation machinery.

**Why:** Callers can identify which component decides the current business state.

**Example:** In the bundled Habit Tracker, HabitsFeature owns saved habits while a repository handles persistence.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Related reading:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Trace reads and writes through all screens and services and check for competing authorities.

**Full rule, context and examples:** [Preserve One Authoritative Owner for Shared State](../topics/24-preserve-one-authoritative-owner-for-shared-state.md). This card is a reading aid; apply the complete canonical section.
