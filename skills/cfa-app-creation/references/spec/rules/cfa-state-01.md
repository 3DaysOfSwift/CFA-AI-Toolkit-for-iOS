# CFA-SPEC-STATE-01: Keep one authoritative Feature owner

**Applies when:** Managing shared application state.

**Strength:** Required.

**Guidance:** A single MainActor Feature owns each piece of authoritative shared application state; lower services may own implementation machinery.

**Why:** Callers can identify which component decides the current business state.

**Example:** WeightLogFeature owns saved weight entries while a storage service handles persistence.

**Open-source code:** [Trend](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA/blob/2a747bc222535e9fda01ed722e9c2c103fb98905/Trend/2%20-%20AppModel/Features/WeightLog/WeightLogFeature.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries) · [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership).

**Verify:** Trace reads and writes through all screens and services and check for competing authorities.

**Full rule, context and examples:** [Preserve One Authoritative Owner for Shared State](../topics/24-preserve-one-authoritative-owner-for-shared-state.md). This card is a reading aid; apply the complete canonical section.
