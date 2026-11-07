# CFA-SPEC-UI-07: Keep SwiftUI construction fast

**Applies when:** Constructing a SwiftUI View or ViewModel.

**Strength:** Required.

**Guidance:** Avoid blocking I/O, slow work and asynchronous side effects in initializers and body construction.

**Why:** SwiftUI may construct Views repeatedly and must remain responsive.

**Example:** A ViewModel is initialized cheaply and asks its Feature to start work through a named method.

**Explanation:** [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).

**Verify:** Inspect initializers and measure slow paths where needed.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
