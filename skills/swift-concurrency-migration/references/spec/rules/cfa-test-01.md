# CFA-SPEC-TEST-01: Test architecture at its boundaries

**Applies when:** Implementing or changing CFA behaviour.

**Strength:** Required.

**Guidance:** Test observable behaviour with isolated Feature dependencies and real ownership boundaries.

**Why:** Tests establish behaviour rather than reproduce implementation details.

**Example:** A Feature test injects a failing storage dependency and verifies that the saved value stays unchanged.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Run relevant tests and builds; state what was not executed.

**Full rule, context and examples:** [Test the Same Boundaries the Architecture Advertises](../topics/26-test-the-same-boundaries-the-architecture-advertises.md). This card is a reading aid; apply the complete canonical section.
