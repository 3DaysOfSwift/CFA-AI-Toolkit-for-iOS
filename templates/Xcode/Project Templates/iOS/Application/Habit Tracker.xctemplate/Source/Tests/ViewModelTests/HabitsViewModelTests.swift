import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

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
}
