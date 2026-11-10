import Foundation
import Combine
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - Legacy implementation
// SwiftUI can observe the legacy object's @Published property.
@MainActor
final class LegacyHabitModel: ObservableObject {
    @Published private(set) var completedDays = 0
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
    let legacyHabitModel = LegacyHabitModel()
    let notificationCount = NotificationCount()
    let subscription = legacyHabitModel.objectWillChange.sink { notificationCount.record() }
    legacyHabitModel.recordCompletedDay()
    legacyHabitModel.recordCompletedDay()
    precondition(legacyHabitModel.completedDays == 2 && notificationCount.read() == 2)
    withExtendedLifetime(subscription) {}
    print("Passed: Combine publishes both updates.")
}

// MARK: - Run before example
Task { @MainActor in
     runExample()
    PlaygroundPage.current.finishExecution()
}
