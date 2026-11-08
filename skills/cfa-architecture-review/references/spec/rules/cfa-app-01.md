# CFA-SPEC-APP-01: Compose the application model once per process

**Applies when:** Composing a CFA app or target.

**Strength:** Required.

**Guidance:** AppModel constructs and exposes concrete Features through an explicit graph and contains no UI navigation or Feature business rules.

**Why:** The Model has one visible entry point within each process.

**Example:** In [NotesReference.swift](../examples/NotesReference.swift), AppModel.live() constructs NotesFeature and its storage dependency for the application graph.

**Explanation:** [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).

**Verify:** Review live composition, initializer dependencies and isolated test graphs.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
