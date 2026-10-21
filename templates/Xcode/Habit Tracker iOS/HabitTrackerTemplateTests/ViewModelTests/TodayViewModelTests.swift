import Foundation
import Testing

@testable import HabitTrackerTemplate

@Suite("Today screen")
@MainActor
struct TodayViewModelTests {
    @Test("Shows today's completion count")
    func completionCount() async {
        let repository = InMemoryHabitsRepository(habits: [
            Habit(id: UUID(), name: "Run", tracking: .completion, unit: "", dailyTarget: nil,
                  entries: [HabitEntry(id: UUID(), date: .now, value: 1)]),
            Habit(id: UUID(), name: "Read", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        ])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(habitsFeature: feature)

        #expect(viewModel.completedCount == 1)
    }

    @Test("Completing a habit records today's value through the feature")
    func completionRoutesToFeature() async {
        let habit = Habit(id: UUID(), name: "Run", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        let repository = InMemoryHabitsRepository(habits: [habit])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(habitsFeature: feature)

        viewModel.toggle(habit)
        let result = await repository.waitForRecord()

        #expect(result.0 == habit.id)
        #expect(result.1 == 1)
    }
}
