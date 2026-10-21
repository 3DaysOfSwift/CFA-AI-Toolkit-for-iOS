import Foundation
import Testing

@testable import HabitTrackerTemplate

@Suite("AppModel composition")
@MainActor
struct AppModelTests {
    @Test("Three tab Features use one authoritative habit collection")
    func tabFeaturesShareHabits() async throws {
        let suiteName = "HabitTrackerTemplate.AppModelTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository())
        let todayFeature = TodayFeature(habitsFeature: habitsFeature)
        let settingsFeature = SettingsFeature(defaults: defaults)
        let appModel = AppModel(todayFeature: todayFeature, habitsFeature: habitsFeature, settingsFeature: settingsFeature)

        #expect(appModel.todayFeature === todayFeature)
        #expect(appModel.habitsFeature === habitsFeature)
        #expect(appModel.settingsFeature === settingsFeature)
        try await appModel.habitsFeature.addHabit(name: "Read", tracking: .completion, unit: "", dailyTarget: nil)
        let habit = try #require(appModel.todayFeature.habits.first)
        try await appModel.todayFeature.recordToday(habitID: habit.id, value: 1)
        #expect(appModel.habitsFeature.habits.first?.todayValue == 1)
        #expect(appModel.todayFeature.completedCount == 1)
    }
}
