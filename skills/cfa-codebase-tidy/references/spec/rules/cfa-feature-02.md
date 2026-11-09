# CFA-SPEC-FEATURE-02: Compose Features only for real workflows

**Applies when:** A business workflow genuinely spans Features.

**Strength:** Default.

**Guidance:** Start with independent Features and inject lower-level services through their initializers. An existing Feature or a distinct coordinating Feature may coordinate other Features when a reusable business responsibility requires it. Keep the dependency direction explicit and acyclic. A screen that only combines existing outputs can do that in its ViewModel.

**Why:** Avoid both feature spaghetti and needless coordinators.

**Example:** A Today capability can coordinate existing Features when its reusable selection decisions belong in the Model. A cohesive CheckoutFeature can own its cart and use a private payment service.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Verify:** Trace the workflow, verify one owner per state and check dependencies for cycles.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
