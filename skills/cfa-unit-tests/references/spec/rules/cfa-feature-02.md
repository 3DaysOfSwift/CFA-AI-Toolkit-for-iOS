# CFA-SPEC-FEATURE-02: Compose Features only for real workflows

**Applies when:** A business workflow genuinely spans Features.

**Strength:** Default.

**Guidance:** Prefer independent Features; an existing Feature or distinct coordinating Feature can coordinate other Features when a real business responsibility requires it.

**Why:** Avoid both feature spaghetti and needless coordinators.

**Example:** A Today capability can coordinate existing Features when its reusable selection decisions belong in the Model.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Verify:** Trace the workflow, verify one owner per state and check dependencies for cycles.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
