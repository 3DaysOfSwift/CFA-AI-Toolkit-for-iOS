import Foundation
import Testing

@testable import HabitTrackerPro

@Suite("AppModel composition")
@MainActor
struct AppModelTests {
    @Test("Five tab Features use one authoritative habit collection")
    func tabFeaturesShareHabits() async throws {
        let suiteName = "HabitTrackerPro.AppModelTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        let dayStreakFeature = DayStreakFeature(habitsFeature: habitsFeature)
        let settingsFeature = SettingsFeature(defaults: defaults)
        let purchasesFeature = PurchasesFeature(store: TestPurchaseStore())
        let trendsFeature = TrendsFeature(habitsFeature: habitsFeature, purchasesFeature: purchasesFeature)
        let appModel = AppModel(todayFeature: todayFeature, habitsFeature: habitsFeature,
                                dayStreakFeature: dayStreakFeature, settingsFeature: settingsFeature,
                                purchasesFeature: purchasesFeature, trendsFeature: trendsFeature)

        #expect(appModel.todayFeature === todayFeature)
        #expect(appModel.habitsFeature === habitsFeature)
        #expect(appModel.dayStreakFeature === dayStreakFeature)
        #expect(appModel.settingsFeature === settingsFeature)
        #expect(appModel.trendsFeature === trendsFeature)
        #expect(appModel.purchasesFeature === purchasesFeature)
        try await appModel.habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habit = try #require(appModel.todayFeature.habits.first)
        try await appModel.todayFeature.recordToday(habitID: habit.id, value: 1)
        #expect(appModel.habitsFeature.habits.first?.todayValue == 1)
        #expect(appModel.todayFeature.completedHabitCount == 1)
        #expect(appModel.dayStreakFeature.summaries.first?.currentStreak == 1)
    }
}
