import Foundation
import Testing

@testable import HabitTrackerPro

@Suite("Habits screen")
@MainActor
struct HabitsViewModelTests {
    @Test("Explains the number of habits")
    func habitCountSummary() async {
        let repository = InMemoryHabitsRepository(habits: [
            Habit(id: UUID(), name: "Run", tracking: .completion,
                  unit: "", dailyTarget: nil, entries: [])
        ])
        let feature = HabitsFeature(repository: repository)
        let viewModel = HabitsViewModel(habitsFeature: feature)
        #expect(viewModel.habitCountSummary == "0 daily habits")

        await feature.reload()

        #expect(viewModel.habitCountSummary == "1 daily habit")
    }

    @Test("Describes count and completion habits for the screen")
    func habitDescriptions() {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        let viewModel = HabitsViewModel(habitsFeature: feature)
        let count = Habit(id: UUID(), name: "Walk", tracking: .count,
                          unit: "steps", dailyTarget: 10, entries: [])
        let completion = Habit(id: UUID(), name: "Read", tracking: .completion,
                               unit: "", dailyTarget: nil, entries: [])
        #expect(viewModel.description(for: count) == "Count in steps · target 10")
        #expect(viewModel.description(for: completion) == "Daily completion")
    }

    @Test("Presents a loading failure without exposing infrastructure text")
    func loadingFailureMessage() async {
        let feature = HabitsFeature(repository: HabitsScreenFailingRepository())
        let viewModel = HabitsViewModel(habitsFeature: feature)

        await feature.reload()

        #expect(viewModel.loadError == "Your saved habits could not be loaded. Please try again.")
    }

}

private actor HabitsScreenFailingRepository: HabitsRepository {
    func fetchHabits() async throws -> [Habit] { throw CocoaError(.fileReadNoPermission) }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}
