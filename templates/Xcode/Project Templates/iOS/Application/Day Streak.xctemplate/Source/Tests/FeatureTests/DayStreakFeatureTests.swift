import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct DayStreakFeatureTests {
    @Test func yesterdayStreakSurvivesUntilTodayEndsThenGapResetsIt() async throws {
        let env = TestEnvironment()
        try await env.start()
        try await env.finish()
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        try await env.streak.refresh()
        #expect(env.streak.currentStreak == 1)
        try await env.start()
        try await env.finish()
        #expect(env.streak.currentStreak == 2)
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 2, to: env.clock.date))
        try await env.streak.refresh()
        #expect(env.streak.currentStreak == 0)
        #expect(env.streak.longestStreak == 2)
        #expect(env.streak.week.count == 7)
    }

    @Test func calendarDaysWorkAcrossDSTAndLeapDay() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(identifier: "Europe/Paris"))
        for components in [DateComponents(year: 2024, month: 3, day: 1), DateComponents(year: 2026, month: 3, day: 30)] {
            let today = try #require(calendar.date(from: components))
            let dates = try (-3...0).map { offset in
                try #require(calendar.date(byAdding: .day, value: offset, to: today))
            }
            #expect(DayStreakFeature.streak(endingNear: today, days: Set(dates), calendar: calendar) == 4)
        }
    }
}
