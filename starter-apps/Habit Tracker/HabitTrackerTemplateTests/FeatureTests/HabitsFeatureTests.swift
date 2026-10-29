import Foundation
import Testing

@testable import HabitTrackerTemplate

private actor FailingHabitsRepository: HabitsRepository {
    enum Failure: LocalizedError {
        case cannotOpen
        var errorDescription: String? { "Database unavailable" }
    }

    func fetchHabits() async throws -> [Habit] { throw Failure.cannotOpen }
    func insertHabit(_ habit: Habit) async throws { throw Failure.cannotOpen }
    func record(habitID: UUID, date: Date, value: Int) async throws { throw Failure.cannotOpen }
}

@Suite("Habits feature")
@MainActor
struct HabitsFeatureTests {
    @Test("Loading failure stays in the feature for the screen to present")
    func reportsLoadingFailure() async {
        let feature = HabitsFeature(repository: FailingHabitsRepository())
        await feature.reload()
        #expect(feature.loadError == "Database unavailable")
        #expect(feature.habits.isEmpty)
        #expect(!feature.isLoading)
    }

    @Test("Add validates a habit name before saving")
    func rejectsEmptyName() async {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())

        await #expect(throws: HabitError.invalidName) {
            try await feature.addHabit(name: "  ", tracking: .completion, unit: "", dailyTarget: nil)
        }
        #expect(feature.habits.isEmpty)
    }

    @Test("A saved habit is published after storage succeeds")
    func addsHabit() async throws {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        try await feature.addHabit(name: "  Running ", tracking: .completion, unit: "", dailyTarget: nil)

        #expect(feature.habits.map(\.name) == ["Running"])
    }
}
