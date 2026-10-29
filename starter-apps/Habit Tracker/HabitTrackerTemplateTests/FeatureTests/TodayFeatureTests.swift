import Foundation
import Testing

@testable import HabitTrackerTemplate

@Suite("Today feature")
@MainActor
struct TodayFeatureTests {
    @Test("Today observes habits added through the Habits feature without reloading")
    func sharedHabits() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)

        #expect(todayFeature.habits.isEmpty)
        try await habitsFeature.addHabit(name: "Pull ups", tracking: .count, unit: "reps", dailyTarget: 10)
        let habit = try #require(todayFeature.habits.first)
        #expect(todayFeature.completedHabitCount == 0)
        #expect(todayFeature.valueForTogglingCompletion(habitID: habit.id) == 10)

        try await todayFeature.recordToday(habitID: habit.id, value: 9)
        #expect(todayFeature.completedHabitCount == 0)
        try await todayFeature.recordToday(habitID: habit.id, value: 10)
        #expect(todayFeature.completedHabitCount == 1)
        #expect(habitsFeature.habits.first?.todayValue == 10)
        #expect(todayFeature.valueForTogglingCompletion(habitID: habit.id) == 0)

        try await todayFeature.recordToday(habitID: habit.id, value: 0)
        #expect(todayFeature.completedHabitCount == 0)
        #expect(habitsFeature.habits.first?.todayValue == 0)
    }

    @Test("Completion habits toggle to one and unknown habits have no completion command")
    func completionValues() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        try await habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habit = try #require(todayFeature.habits.first)
        #expect(todayFeature.valueForTogglingCompletion(habitID: habit.id) == 1)
        #expect(todayFeature.valueForTogglingCompletion(habitID: UUID()) == nil)
        await #expect(throws: HabitError.invalidEntry) {
            try await todayFeature.recordToday(habitID: habit.id, value: -1)
        }
        #expect(todayFeature.completedHabitCount == 0)
    }

    @Test("Today exposes a failed data request and recovers through the same shared owner")
    func loadingFailureAndRetry() async {
        let habit = Habit(id: UUID(), name: "Read", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        let repository = RecoverableTodayRepository(habit: habit)
        let habitsFeature = HabitsFeature(repository: repository)
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        await todayFeature.reload()
        #expect(todayFeature.loadError != nil)
        #expect(!todayFeature.isLoading)

        await repository.allowLoading()
        await todayFeature.reload()
        #expect(todayFeature.loadError == nil)
        #expect(todayFeature.habits.map(\.id) == [habit.id])
        #expect(habitsFeature.habits.map(\.id) == [habit.id])
    }
}

private actor RecoverableTodayRepository: HabitsRepository {
    private let habit: Habit
    private var failsLoading = true
    init(habit: Habit) { self.habit = habit }
    func allowLoading() { failsLoading = false }
    func fetchHabits() async throws -> [Habit] {
        if failsLoading { throw CocoaError(.fileReadNoPermission) }
        return [habit]
    }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, date: Date, value: Int) async throws {}
}
