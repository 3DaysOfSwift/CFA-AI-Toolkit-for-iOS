# CFA-SPEC-SVC-01: Keep microservices small and well placed

**Applies when:** Choosing or sharing lower-level services.

**Strength:** Default.

**Guidance:** Keep domain-specific services beside their Feature while that location describes their purpose, even when another Feature uses them. Move broadly applicable services to a shared location. Compose a shared dependency locally in AppModel.live() when common configuration or shared state warrants it, and inject it into its consumers.

**Why:** Organizing code around capability makes it easier to find.

**Example:** A launch-specific provider can stay in the schedule folder; a generic network wrapper may move to shared services.

**Verify:** Inspect actual service users, mutable state, dependency injection and responsibilities.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
