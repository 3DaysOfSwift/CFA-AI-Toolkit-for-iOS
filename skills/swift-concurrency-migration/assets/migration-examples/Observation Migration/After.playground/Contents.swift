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
    func completeToday() { completedDays += 1 }
}

// MARK: - Test fixtures
// Test-only notification counter.
// allows the callbacks to record notifications safely.
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
    feature.completeToday()
    feature.completeToday()
    precondition(feature.completedDays == 2 && count.read() == 1)
    print("Passed: Observation tracking reports the first update and is one-shot.")
}

// MARK: - Run after example
Task { @MainActor in
     runExample()
    PlaygroundPage.current.finishExecution()
}
