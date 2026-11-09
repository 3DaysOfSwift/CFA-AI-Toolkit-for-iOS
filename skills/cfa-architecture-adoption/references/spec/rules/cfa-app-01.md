# CFA-SPEC-APP-01: Compose the application model once per process

**Applies when:** Composing a CFA app or target.

**Strength:** Required.

**Guidance:** Use one static live() factory to construct production dependencies for AppModel.shared. The explicit initializer assigns supplied concrete Features, sets the launch guard to false, and sets any listener handles to nil. AppModel stores the shared graph, concrete Feature references, one private launch guard, and any private task handles needed for app-wide listeners. The factory injects services into Features without storing the services on AppModel. Keep UI navigation and Feature business rules outside AppModel.

**Why:** The Model has one visible entry point within each process.

**Example:** In [NotesReference.swift](../examples/NotesReference.swift), AppModel.live() constructs NotesFeature and its storage dependency for the application graph.

**Explanation:** [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).

**Verify:** Verify that shared is a stored static let using live(). Inspect every other stored property for an allowed role, and check that the explicit initializer supplies its initial value. Confirm that tests supply isolated Features without mutating the production graph.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
