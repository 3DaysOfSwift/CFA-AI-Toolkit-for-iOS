# CFA-SPEC-UI-03: Pass selected values to detail screens

**Applies when:** A destination needs a selected item.

**Strength:** Permitted exception.

**Guidance:** A detail View may receive a selected immutable snapshot and use it to construct its own State-backed ViewModel in the View initializer.

**Why:** Each destination can preserve its selection independently.

**Example:** Two launch detail destinations each receive their own selected launch snapshot.

**Explanation:** [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).

**Verify:** Test two independently selected destinations and confirm refresh does not silently replace a displayed snapshot.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
