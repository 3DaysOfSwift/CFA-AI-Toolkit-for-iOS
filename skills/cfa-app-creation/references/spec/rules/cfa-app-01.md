# CFA-SPEC-APP-01: Compose the application model once per process

**Applies when:** Composing a CFA app or target.

**Strength:** Required.

**Guidance:** Use one static live() factory to construct production dependencies for AppModel.shared. The explicit initializer assigns supplied concrete Features, sets the launch guard to false, and sets any listener handles to nil. Keep UI navigation and Feature business rules outside AppModel.

**Why:** The Model has one visible entry point within each process.

**Example:** In [NotesReference.swift](../examples/NotesReference.swift), AppModel.live() constructs NotesFeature and its storage dependency for the application graph.

**Explanation:** [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).

**Verify:** Verify the shared instance uses live(), and check for inline stored-property defaults other than shared. Confirm that tests supply isolated Features through the explicit initializer.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
