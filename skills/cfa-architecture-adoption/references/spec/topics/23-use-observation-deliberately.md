## Use Observation Deliberately

For supported modern deployment targets, use `@Observable` rather than Combine
publisher plumbing for UI-readable reference state.

- Put `@Observable` on ViewModels and UI-observed features.
- Put ViewModels and all Features on `@MainActor`; a Feature without a current
  screen follows the same isolation convention.
- Own a ViewModel with `@State` in its View.
- Create an `@Bindable` projection only when a SwiftUI control requires a
  writable binding.
- Do not manually forward change notifications.
- Do not add `@Published`, `ObservableObject`, or Combine without a concrete
  compatibility or publisher-composition requirement.

A computed property does not emit an independent notification. SwiftUI tracks
the observable stored properties read while evaluating it. Ensure the computed
property reads observable feature state or expose a stored observable result
when it represents completed asynchronous work.

