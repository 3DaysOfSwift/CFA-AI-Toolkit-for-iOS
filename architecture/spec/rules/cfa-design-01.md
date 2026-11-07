# CFA-SPEC-DESIGN-01: Preserve product intent

**Applies when:** Creating, migrating or maintaining an app.

**Strength:** Required.

**Guidance:** Follow the requested scope and existing design; avoid adding optional product capabilities or changing behaviour without a requirement.

**Why:** Architecture should support the product rather than silently redesign it.

**Example:** A migration preserves the existing purchase flow instead of introducing a new paywall design.

**Explanation:** [Why use behaviour-preserving migration in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/preserve-product-behaviour).

**Verify:** Compare changes with the requested journey and existing behaviour contract.

**Full rule, context and examples:** [Architecture versus product design](../topics/05-architecture-versus-product-design.md). This card is a reading aid; apply the complete canonical section.
