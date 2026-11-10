import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

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

    @Test func calendarDaysWorkAcrossDSTAndLeapDay() async throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(identifier: "Europe/Paris"))
        for components in [DateComponents(year: 2024, month: 3, day: 1), DateComponents(year: 2026, month: 3, day: 30)] {
            let today = try #require(calendar.date(from: components))
            let dates = try (-3...0).map { offset in
                try #require(calendar.date(byAdding: .day, value: offset, to: today))
            }
            let question = MultiplicationQuestion(id: UUID(), left: 9, right: 9, choices: [81])
            let sessions = dates.map { date in
                PracticeSession(id: UUID(), day: date, isExtraPractice: false,
                                difficulty: .everyday, question: question,
                                correctCount: PracticeSession.target, completedAt: date)
            }
            let environment = TestEnvironment(repository: MemorySessions(sessions),
                                              clock: TestClock(today), calendar: calendar)

            try await environment.streak.refresh()

            #expect(environment.streak.currentStreak == 4)
        }
    }
}
