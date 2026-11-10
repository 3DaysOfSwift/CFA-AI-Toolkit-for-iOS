import Foundation
import Testing

@testable import HabitTrackerTemplate

@Suite("Add habit screen")
@MainActor
struct AddHabitViewModelTests {
    @Test("Saving sends the form values to the habits feature")
    func savesDraft() async throws {
        let repository = InMemoryHabitsRepository()
        let feature = HabitsFeature(repository: repository)
        let viewModel = AddHabitViewModel(habitsFeature: feature)
        viewModel.name = "Pull ups"
        viewModel.tracking = .count
        viewModel.unit = "reps"
        viewModel.dailyTargetText = "10"

        let first = viewModel.save()
        let repeated = viewModel.save() // The disabled editor submits the same pending save.
        viewModel.name = "Changed after Save" // Verify the submitted snapshot is retained.
        await first.value
        await repeated.value
        let savedHabits = try await repository.fetchHabits()
        let savedHabit = try #require(savedHabits.first)

        #expect(savedHabits.count == 1)
        #expect(savedHabit.name == "Pull ups")
        #expect(savedHabit.tracking == .count)
        #expect(savedHabit.dailyTarget == 10)
    }

    @Test("A failed save keeps the draft and can be retried")
    func failedSaveKeepsDraftForRetry() async throws {
        let repository = RetryHabitRepository()
        let feature = HabitsFeature(repository: repository)
        let viewModel = AddHabitViewModel(habitsFeature: feature)
        viewModel.name = "Read"
        viewModel.tracking = .count
        viewModel.unit = "pages"
        viewModel.dailyTargetText = "5"

        await viewModel.save().value
        #expect(viewModel.errorMessage == "Your habit could not be saved. Please try again.")
        #expect(!viewModel.didSave && !viewModel.isSaving)
        #expect(viewModel.name == "Read" && viewModel.unit == "pages")
        #expect(viewModel.dailyTargetText == "5" && viewModel.tracking == .count)
        #expect(feature.habits.isEmpty)

        await repository.allowWrites()
        await viewModel.save().value
        #expect(viewModel.errorMessage == nil && viewModel.didSave)
        #expect(feature.habits.first?.name == "Read")
        #expect(feature.habits.first?.dailyTarget == 5)
    }

    @Test("Validation errors are translated for the form")
    func validationMessage() async {
        let viewModel = AddHabitViewModel(habitsFeature: HabitsFeature(repository: InMemoryHabitsRepository()))

        await viewModel.save().value

        #expect(viewModel.errorMessage == "Enter a name for this habit.")
    }

}


private actor RetryHabitRepository: HabitsRepository {
    private var stored: [Habit] = []
    private var failsWrites = true
    func allowWrites() { failsWrites = false }
    func fetchHabits() async throws -> [Habit] { stored }
    func insertHabit(_ habit: Habit) async throws {
        if failsWrites { throw CocoaError(.fileWriteNoPermission) }
        stored.append(habit)
    }
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}
