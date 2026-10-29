import Foundation
import Testing
@testable import HabitTrackerPro

@Suite("Paid trend calculations")
@MainActor
struct TrendsFeatureTests {
    @Test func accessTargetsHistoryAndRevocation() async throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(secondsFromGMT: 0))
        let today = Date(timeIntervalSince1970: 1_800_000_000)
        let yesterday = try #require(calendar.date(byAdding: .day, value: -1, to: today))
        let tomorrow = try #require(calendar.date(byAdding: .day, value: 1, to: today))
        let habit = Habit(id: UUID(), name: "Pull ups", tracking: .count, unit: "Reps", dailyTarget: 10,
                          entries: [HabitEntry(id: UUID(), date: yesterday, value: 5),
                                    HabitEntry(id: UUID(), date: today, value: 10),
                                    HabitEntry(id: UUID(), date: tomorrow, value: 20)])
        let habits = HabitsFeature(repository: InMemoryHabitsRepository(habits: [habit]))
        await habits.reload()
        let store = TestPurchaseStore()
        let purchases = PurchasesFeature(store: store)
        let trends = TrendsFeature(habitsFeature: habits, purchasesFeature: purchases,
                                   calendar: calendar, currentDate: { today })
        #expect(trends.trends.isEmpty)
        await purchases.purchaseTrends()
        let chart = try #require(trends.trends.first)
        #expect(chart.days.count == 30)
        #expect(chart.days.suffix(2).map(\.value) == [5, 10])
        #expect(chart.completedDayCount == 1)
        #expect(chart.weeks.count == 4)
        #expect(chart.weeks.last?.completedDayCount == 1)
        #expect(chart.dailyTarget == 10)
        store.entitled = false
        await purchases.refreshEntitlement()
        #expect(trends.trends.isEmpty)
    }
}
