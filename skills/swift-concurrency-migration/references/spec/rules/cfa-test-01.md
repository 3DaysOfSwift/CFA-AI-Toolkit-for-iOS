# CFA-SPEC-TEST-01: Test architecture at its boundaries

**Applies when:** Implementing or changing CFA behaviour.

**Strength:** Required.

**Guidance:** Give each ViewModel and concrete Feature its own named test file. Test observable behaviour with isolated dependencies and keep AppModel tests separate from the production shared instance. Await Feature commands directly. Verify that equivalent requests share an outcome and separately admitted commands complete in order with individual outcomes. Cover cancellation, stale results and failure recovery where they affect correctness.

**Why:** Tests establish behaviour rather than reproduce implementation details.

**Example:** A Feature test injects a failing storage dependency and verifies that the saved value stays unchanged.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Run relevant tests and builds. Use controlled dependencies to verify ordering and outcomes across suspension. Record any checks that could not run.

**Full rule, context and examples:** [Test the Same Boundaries the Architecture Advertises](../topics/26-test-the-same-boundaries-the-architecture-advertises.md). This card is a reading aid; apply the complete canonical section.
