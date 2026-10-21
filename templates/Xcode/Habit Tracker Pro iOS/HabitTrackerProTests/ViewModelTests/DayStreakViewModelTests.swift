import Foundation
import Testing

@testable import HabitTrackerPro

@Suite("Day streak screen")
@MainActor
struct DayStreakViewModelTests {
    @Test("Day Streak observes recorded progress without a separate reload")
    func reflectsSharedHistory() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let dayStreakFeature = DayStreakFeature(habitsFeature: habitsFeature)
        let viewModel = DayStreakViewModel(dayStreakFeature: dayStreakFeature)
        #expect(viewModel.summaries.isEmpty)
        try await habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habit = try #require(habitsFeature.habits.first)
        #expect(viewModel.summaries.first?.currentStreak == 0)
        try await habitsFeature.recordToday(habitID: habit.id, value: 1)
        #expect(viewModel.summaries.first?.currentStreak == 1)
        let day = try #require(viewModel.summaries.first?.recentDays.last)
        #expect(!viewModel.weekday(for: day).isEmpty)
        #expect(viewModel.accessibilityLabel(for: day).contains("Completed"))
        try await habitsFeature.recordToday(habitID: habit.id, value: 0)
        #expect(viewModel.summaries.first?.currentStreak == 0)
    }

    @Test("Failed history requests remain recoverable in the Day Streak screen")
    func failureAndRetry() async {
        let repository = StreakLoadingRepository()
        let habitsFeature = HabitsFeature(repository: repository)
        let viewModel = DayStreakViewModel(dayStreakFeature: DayStreakFeature(habitsFeature: habitsFeature))
        await viewModel.retryLoading()
        #expect(viewModel.loadError != nil)
        #expect(!viewModel.isLoading)
        await repository.allowLoading()
        await viewModel.retryLoading()
        #expect(viewModel.loadError == nil)
    }
}

private actor StreakLoadingRepository: HabitsRepository {
    private var failsLoading = true
    func allowLoading() { failsLoading = false }
    func fetchHabits() async throws -> [Habit] {
        if failsLoading { throw CocoaError(.fileReadNoPermission) }
        return []
    }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, date: Date, value: Int) async throws {}
}
