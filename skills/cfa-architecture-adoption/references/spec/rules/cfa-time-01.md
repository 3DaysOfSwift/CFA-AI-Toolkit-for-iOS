# CFA-SPEC-TIME-01: Inject volatile dependencies

**Applies when:** Business decisions depend on time or another changing external value.

**Strength:** Required when applicable.

**Guidance:** Supply volatile dependencies in a controllable form rather than hiding them in business decisions.

**Why:** Time-dependent behaviour can be reproduced in tests.

**Example:** A countdown decision uses an injected clock.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Test boundary dates and time zones using controlled inputs.

**Full rule, context and examples:** [Keep Time and Other Volatile Dependencies Injectable](../topics/22-keep-time-and-other-volatile-dependencies-injectable.md). This card is a reading aid; apply the complete canonical section.
