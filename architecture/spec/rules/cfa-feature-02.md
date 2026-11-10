# CFA-SPEC-FEATURE-02: Compose Features only for real workflows

**Applies when:** A business workflow genuinely spans Features.

**Strength:** Default.

**Guidance:** Start with independent Features and inject lower-level services through their initializers. An existing Feature or a distinct coordinating Feature may coordinate other Features when a reusable business responsibility requires it. Keep the dependency direction explicit and acyclic. A coordinating Feature belongs in AppModel and the standard Feature folder structure. It owns its workflow decisions and uses the existing authoritative state owners. A screen that only combines existing outputs does so in its ViewModel. During migration, avoid creating a coordinating Feature for each screen and preserve existing behaviour.

**Why:** Avoid both feature spaghetti and needless coordinators.

**Example:** A Today capability can coordinate existing Features when its reusable selection decisions belong in the Model. A cohesive CheckoutFeature can own its cart and use a private payment service.

**Explanation:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Verify:** Name the business decision that justifies coordination. Trace which Feature owns each decision and state update. Verify one authoritative owner per state value, check for cycles and verify existing behaviour when migrating.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
