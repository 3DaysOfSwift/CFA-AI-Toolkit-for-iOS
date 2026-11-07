## Prohibited Patterns

Reject or refactor the following during review:

- business calculations, classifications, validation, or filtering in a View;
- reusable business rules in a ViewModel;
- one ViewModel shared by multiple unique screens;
- ViewModels stored by AppModel, a root ViewModel, or another ViewModel;
- Views receiving ViewModels, Features, AppModel, or repositories;
- screen Views receiving service closures or another screen’s ViewModel actions;
- ViewModels depending on the whole AppModel instead of the smallest coherent
  set of narrow feature APIs;
- features containing navigation, sheets, dialogs, or screen names;
- repositories imported directly by Views or ViewModels;
- deep chains through the AppModel object graph;
- default live dependencies hidden in `AppModel.init`;
- asynchronous side effects inside initializers;
- Task handles stored by a SwiftUI View;
- vague lifecycle or action names such as `start`, `begin`, `process`, and
  `prepareForUse`;
- speculative folders, layers, or abstractions;
- `@unchecked Sendable` used as a compiler-warning escape hatch;
- serializing independent work when the required behaviour is concurrent;
- unstructured Tasks whose lifetime or cancellation affects correctness but is
  not stored and managed;
- Combine observation added where the Observation framework is sufficient.
- competing copies of shared feature state in multiple ViewModels;
- feature APIs exposing directly mutable domain collections;
- domain types placed under storage merely because they are persisted;
- swallowed business or persistence failures;
- expensive or blocking work performed on the Main Actor.

