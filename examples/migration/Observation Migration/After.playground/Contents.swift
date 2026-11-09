import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
// Observation tracks properties accessed by the observer. The macro
// does not provide actor isolation; MainActor remains explicit.
@MainActor @Observable
final class HabitFeature {
    private(set) var completedDays = 0
    func recordCompletedDay() { completedDays += 1 }
}

@MainActor @Observable
final class HabitViewModel {
    private let habitFeature: HabitFeature

    init(habitFeature: HabitFeature) {
        self.habitFeature = habitFeature
    }

    var completedDays: Int { habitFeature.completedDays }
}

// MARK: - Test fixtures
// Test-only counter records observation callbacks safely.
final class NotificationCount: @unchecked Sendable {
    private let lock = NSLock()
    private var value = 0
    func record() { lock.lock(); defer { lock.unlock() }; value += 1 }
    func read() -> Int { lock.lock(); defer { lock.unlock() }; return value }
}

// MARK: - Behaviour check
@MainActor
func runExample() {
    let feature = HabitFeature()
    let viewModel = HabitViewModel(habitFeature: feature)
    let count = NotificationCount()
    withObservationTracking { _ = viewModel.completedDays } onChange: { count.record() }
    feature.recordCompletedDay()
    feature.recordCompletedDay()
    precondition(viewModel.completedDays == 2 && count.read() == 1)

    // Register the next read and pick up the latest state, including changes
    // made after the first registration fired.
    let latestCount = withObservationTracking { viewModel.completedDays } onChange: { count.record() }
    precondition(latestCount == 2)
    feature.recordCompletedDay()
    precondition(viewModel.completedDays == 3 && count.read() == 2)
    print("Passed: Observation tracking is one-shot and can be registered again.")
}

// MARK: - Run after example
Task { @MainActor in
    runExample()
    PlaygroundPage.current.finishExecution()
}
