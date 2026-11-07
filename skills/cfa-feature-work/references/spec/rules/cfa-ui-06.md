# CFA-SPEC-UI-06: Separate domain and display decisions

**Applies when:** Formatting or presenting Feature results.

**Strength:** Required.

**Guidance:** Features decide domain meaning; ViewModels translate results for display and Views render them.

**Why:** Business decisions stay reusable across devices.

**Example:** A Feature determines a domain result and the ViewModel prepares its display label.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries).

**Verify:** Inspect calculations and business classification for leaks into Views and ViewModels.

**Full rule, context and examples:** [Separate Domain Decisions from Display Decisions](../topics/25-separate-domain-decisions-from-display-decisions.md). This card is a reading aid; apply the complete canonical section.
