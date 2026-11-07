# CFA-SPEC-TEST-02: Create focused test targets

**Applies when:** Creating an Xcode project.

**Strength:** Required with explicit exception.

**Guidance:** Create a unit-test target; add a UI-test target only for a specifically requested UI automation scenario.

**Why:** Empty test targets add noise without evidence.

**Example:** A new project has Feature and ViewModel unit tests.

**Explanation:** [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing).

**Verify:** Inspect targets and run the relevant unit tests.

**Full rule, context and examples:** [Project Identity](../topics/06-project-identity.md). This card is a reading aid; apply the complete canonical section.
