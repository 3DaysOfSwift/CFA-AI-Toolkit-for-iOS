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
    let count = NotificationCount()
    withObservationTracking { _ = feature.completedDays } onChange: { count.record() }
    feature.recordCompletedDay()
    feature.recordCompletedDay()
    precondition(feature.completedDays == 2 && count.read() == 1)

    // An observer that needs another notification registers its next read.
    withObservationTracking { _ = feature.completedDays } onChange: { count.record() }
    feature.recordCompletedDay()
    precondition(feature.completedDays == 3 && count.read() == 2)
    print("Passed: Observation tracking is one-shot and can be registered again.")
}

// MARK: - Run after example
Task { @MainActor in
     runExample()
    PlaygroundPage.current.finishExecution()
}
