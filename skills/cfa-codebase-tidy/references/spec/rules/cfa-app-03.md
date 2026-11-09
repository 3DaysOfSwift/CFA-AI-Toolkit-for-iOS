# CFA-SPEC-APP-03: Avoid an application-wide ViewModel

**Applies when:** Composing the presentation layer.

**Strength:** Required.

**Guidance:** Keep ViewModels owned by their screens and out of AppModel.

**Why:** AppModel exposes model capabilities without owning UI state.

**Example:** Each screen-level SwiftUI View creates its own ViewModel, which accesses the required concrete Features.

**Explanation:** [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership) · [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).

**Verify:** Inspect AppModel properties and the ViewModel ownership tree.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
