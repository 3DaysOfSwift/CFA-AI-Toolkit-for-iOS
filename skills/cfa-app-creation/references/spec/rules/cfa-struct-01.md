# CFA-SPEC-STRUCT-01: Keep the project structure understandable

**Applies when:** Creating or restructuring a CFA app.

**Strength:** Required.

**Guidance:** Group Views and ViewModels separately from AppModel, Features and their services; retain actual Xcode target membership.

**Why:** Developers can locate capability ownership without following arbitrary layers.

**Example:** Place NotesEditorView and NotesEditorViewModel together in the View layer, and NotesFeature in the Model layer.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Inspect folders, target membership, resource paths and build configuration.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
