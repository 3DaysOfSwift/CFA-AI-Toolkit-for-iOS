# CFA-SPEC-UI-02: Each screen owns its ViewModel

**Applies when:** Creating or reviewing a SwiftUI screen.

**Strength:** Required.

**Guidance:** A screen creates and retains its own private ViewModel; do not pass or share ViewModels between Views.

**Why:** Presentation state remains local to the screen.

**Example:** NotesView declares its own private State-backed NotesViewModel.

**Explanation:** [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).

**Verify:** Inspect screen declarations, navigation destinations, previews and ViewModel construction.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
