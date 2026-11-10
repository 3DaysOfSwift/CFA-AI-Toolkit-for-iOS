# CFA-SPEC-TEST-01: Test architecture at its boundaries

**Applies when:** Implementing or changing CFA behaviour.

**Strength:** Required.

**Guidance:** Give each ViewModel its own named test file and suite under View model tests. Give each concrete Feature a named API test file under FeatureTests. Test observable behaviour at the boundary that owns it. ViewModel tests inject isolated Features and check presentation. Feature tests exercise domain rules and workflows. Repository tests exercise storage, sync and failure behaviour. AppModel tests construct isolated graphs to check composition and application-wide coordination without using or mutating AppModel.shared. Shut down listeners started by the isolated graph during cleanup. Await Feature commands directly. Verify that equivalent requests share an outcome and separately admitted commands complete in order with individual outcomes. Cover cancellation, stale results and failure recovery where they affect correctness.

**Why:** Tests establish behaviour rather than reproduce implementation details.

**Example:** A Feature test injects a failing storage dependency and verifies that the saved value stays unchanged.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Verify that test files belong to the intended unit-test target, then run the relevant tests and builds. Use deterministic clocks and controllable dependencies to hold work at suspension points. Verify ordering, cancellation cleanup and successful retry where applicable. Record which checks ran and which could not run.

**Full rule, context and examples:** [Test the Same Boundaries the Architecture Advertises](../topics/26-test-the-same-boundaries-the-architecture-advertises.md). This card is a reading aid; apply the complete canonical section.
