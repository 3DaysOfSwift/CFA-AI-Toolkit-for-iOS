import Foundation
import Observation
import Testing

@testable import ___PROJECTNAME:identifier___

@Suite("AppModel composition")
@MainActor
struct AppModelTests {
    @Test("Launch returns while habit storage is waiting and reports its failure")
    func launchDoesNotWaitForStorage() async throws {
        let suiteName = "___PROJECTNAME:identifier___.Launch.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let repository = WaitingHabitRepository()
        let habits = HabitsFeature(repository: repository)
        let settings = SettingsFeature(defaults: defaults)
        let appModel = AppModel(todayFeature: TodayFeature(habitsFeature: habits), habitsFeature: habits,
                             dayStreakFeature: DayStreakFeature(habitsFeature: habits), settingsFeature: settings)

        appModel.applicationDidFinishLaunching()
        await repository.waitForFetch()
        #expect(appModel.settingsFeature === settings)
        #expect(habits.isLoading)
        let changes = AsyncStream<Void>.makeStream()
        withObservationTracking { _ = habits.loadError } onChange: { changes.continuation.yield(()) }
        await repository.releaseWithFailure()
        var iterator = changes.stream.makeAsyncIterator()
        _ = await iterator.next()
        #expect(habits.loadError != nil)
        #expect(!habits.isLoading)
        changes.continuation.finish()
    }

    @Test("Four tab Features use one authoritative habit collection")
    func tabFeaturesShareHabits() async throws {
        let suiteName = "___PROJECTNAME:identifier___.AppModelTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(secondsFromGMT: 0))
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository(), calendar: calendar, currentDate: { date })
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        let dayStreakFeature = DayStreakFeature(habitsFeature: habitsFeature, calendar: calendar, currentDate: { date })
        let settingsFeature = SettingsFeature(defaults: defaults)
        let appModel = AppModel(todayFeature: todayFeature, habitsFeature: habitsFeature,
                                dayStreakFeature: dayStreakFeature, settingsFeature: settingsFeature)

        #expect(appModel.todayFeature === todayFeature)
        #expect(appModel.habitsFeature === habitsFeature)
        #expect(appModel.dayStreakFeature === dayStreakFeature)
        #expect(appModel.settingsFeature === settingsFeature)
        try await appModel.habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habit = try #require(appModel.todayFeature.habits.first)
        try await appModel.todayFeature.recordToday(habitID: habit.id, value: 1)
        #expect(appModel.habitsFeature.habits.first?.value(on: date, calendar: calendar) == 1)
        #expect(appModel.todayFeature.completedHabitCount == 1)
        #expect(appModel.dayStreakFeature.summaries.first?.currentStreak == 1)
    }
}

private actor WaitingHabitRepository: HabitsRepository {
    private var started = false
    private var waiter: CheckedContinuation<Void, Never>?
    private var release: CheckedContinuation<Void, Never>?
    func waitForFetch() async {
        if started { return }
        await withCheckedContinuation { waiter = $0 }
    }
    func releaseWithFailure() { release?.resume(); release = nil }
    func fetchHabits() async throws -> [Habit] {
        started = true
        waiter?.resume(); waiter = nil
        await withCheckedContinuation { release = $0 }
        throw CocoaError(.fileReadNoPermission)
    }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}
