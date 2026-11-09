# CFA-SPEC-TIME-01: Inject volatile dependencies

**Applies when:** Business decisions depend on time or another changing external value.

**Strength:** Required when applicable.

**Guidance:** Inject a clock or date function when a business decision depends on the current time. Read it when the Feature makes the decision so production time continues advancing. Keep date boundaries and comparisons in the Feature. Views can read current time for transient visual presentation. Apply the same approach to randomness, identifiers, locale-sensitive rules and external clients when tests need control.

**Why:** Time-dependent behaviour can be reproduced in tests.

**Example:** A countdown decision uses an injected clock.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Test relevant date boundaries and time zones with controlled inputs. If the same Feature instance must work across a date change, advance the clock and verify that its next decision uses the new time.

**Full rule, context and examples:** [Keep Time and Other Volatile Dependencies Injectable](../topics/22-keep-time-and-other-volatile-dependencies-injectable.md). This card is a reading aid; apply the complete canonical section.
