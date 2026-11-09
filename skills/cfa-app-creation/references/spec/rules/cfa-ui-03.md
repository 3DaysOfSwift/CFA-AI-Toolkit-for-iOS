# CFA-SPEC-UI-03: Pass selected values to detail screens

**Applies when:** A destination needs a selected item.

**Strength:** Permitted exception.

**Guidance:** A detail View may receive a selected immutable snapshot and use it to construct its own State-backed ViewModel in the View initializer. The snapshot is initial input for that destination identity. Keep selection in presentation and preserve the displayed snapshot and navigation when the source list changes. Use explicit refresh where appropriate. Live updates are a product choice.

**Why:** Each destination can preserve its selection independently.

**Example:** Next Rocket Launch passes a selected snapshot into its [detail View](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailView.swift) and its [ViewModel](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency/blob/3ecaa30c76428bd8a6f5db8fd5506b6c20b846f7/Swift%20Concurrency%20Project/RocketLaunch/1%20-%20View/Views/Operators/LaunchDetail/LaunchDetailViewModel.swift).

**Explanation:** [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership).

**Verify:** Open different snapshots in two independently identified destinations. Refresh the source list and verify neither destination silently changes or closes, including when an item is omitted. If the detail offers explicit refresh, verify that it updates only its own display.

**Full rule, context and examples:** [Give Every Unique Screen Its Own ViewModel](../topics/14-give-every-unique-screen-its-own-viewmodel.md). This card is a reading aid; apply the complete canonical section.
