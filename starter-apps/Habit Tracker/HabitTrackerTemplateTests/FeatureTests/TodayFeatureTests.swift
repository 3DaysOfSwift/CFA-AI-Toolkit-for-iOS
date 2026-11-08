import Foundation
import Observation
import Testing

@testable import HabitTrackerTemplate

@Suite("Today feature")
@MainActor
struct TodayFeatureTests {
    private let testDate = Date(timeIntervalSince1970: 1_700_000_000)
    @Test("Today observation follows the shared habits owner")
    func observationFollowsSharedOwner() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        let changes = ObservationProbe()
        withObservationTracking {
            _ = todayFeature.habits
        } onChange: {
            changes.recordChange()
        }
        try await habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        #expect(changes.didChange)
        #expect(todayFeature.habits.count == 1)
    }
    @Test("Today observes habits added through the Habits feature without reloading")
    func sharedHabits() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository(), currentDate: { self.testDate })
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
        #expect(habitsFeature.habits.first?.value(on: testDate, calendar: .current) == 10)
        #expect(todayFeature.valueForTogglingCompletion(habitID: habit.id) == 0)

        try await todayFeature.recordToday(habitID: habit.id, value: 0)
        #expect(todayFeature.completedHabitCount == 0)
        #expect(habitsFeature.habits.first?.value(on: testDate, calendar: .current) == 0)
    }

    @Test("An advancing clock keeps today’s display and saved entries on the same day")
    func dayBoundary() async throws {
        let calendar = Calendar.current
        var now = Date(timeIntervalSince1970: 1_700_000_000)
        let firstDay = calendar.startOfDay(for: now)
        let nextDay = try #require(calendar.date(byAdding: .day, value: 1, to: firstDay))
        let repository = InMemoryHabitsRepository()
        let habitsFeature = HabitsFeature(repository: repository, calendar: calendar, currentDate: { now })
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        try await habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habitID = try #require(todayFeature.habits.first?.id)
        try await todayFeature.recordToday(habitID: habitID, value: 1)
        #expect(todayFeature.completedHabitCount == 1)

        now = nextDay
        #expect(todayFeature.completedHabitCount == 0)
        #expect(todayFeature.valueForTogglingCompletion(habitID: habitID) == 1)
        try await todayFeature.recordToday(habitID: habitID, value: 1)
        #expect(todayFeature.completedHabitCount == 1)
        let entries = try #require(todayFeature.habits.first?.entries)
        #expect(entries.count == 2)
        #expect(entries.contains { calendar.isDate($0.date, inSameDayAs: firstDay) })
        #expect(entries.contains { calendar.isDate($0.date, inSameDayAs: nextDay) })
        await habitsFeature.reload()
        #expect(habitsFeature.habits.first?.entries.count == 2)
    }

    @Test("Completion habits toggle to one and unknown habits have no completion command")
    func completionValues() async throws {
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository(), currentDate: { self.testDate })
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

private final class ObservationProbe: @unchecked Sendable {
    private let lock = NSLock()
    private var changed = false
    var didChange: Bool { lock.withLock { changed } }
    func recordChange() { lock.withLock { changed = true } }
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
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}
