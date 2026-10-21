import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

@Suite("Add habit screen")
@MainActor
struct AddHabitViewModelTests {
    @Test("Saving sends the form values to the habits feature")
    func savesDraft() async {
        let repository = InMemoryHabitsRepository()
        let feature = HabitsFeature(repository: repository)
        let viewModel = AddHabitViewModel(habitsFeature: feature)
        viewModel.name = "Pull ups"
        viewModel.tracking = .count
        viewModel.unit = "reps"
        viewModel.dailyTargetText = "10"

        viewModel.save()
        let savedHabit = await repository.waitForInsert()

        #expect(savedHabit.name == "Pull ups")
        #expect(savedHabit.tracking == .count)
        #expect(savedHabit.dailyTarget == 10)
    }
}
