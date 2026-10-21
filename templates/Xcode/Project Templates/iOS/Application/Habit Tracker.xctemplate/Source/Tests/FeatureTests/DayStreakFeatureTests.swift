import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

@Suite("Day streak feature")
@MainActor
struct DayStreakFeatureTests {
    @Test("A streak includes today or remains active from yesterday")
    func currentStreak() async throws {
        let today = try await summary(days: [0, -1, -2])
        #expect(today.currentStreak == 3)
        let yesterday = try await summary(days: [-1, -2, -3])
        #expect(yesterday.currentStreak == 3)
        #expect(yesterday.recentDays.last?.isComplete == false)
    }

    @Test("An unmet daily target does not count")
    func targetMustBeReached() async throws {
        let progress = try await summary(days: [0], value: 5, target: 10)
        #expect(progress.currentStreak == 0)
        #expect(progress.completedDayCount == 0)
        let complete = try await summary(days: [0], value: 10, target: 10)
        #expect(complete.currentStreak == 1)
    }

    @Test("A gap ends the current streak without erasing the personal best")
    func gapsAndLongestStreak() async throws {
        let progress = try await summary(days: [-2, -3, -4, -8, -9])
        #expect(progress.currentStreak == 0)
        #expect(progress.longestStreak == 3)
        #expect(progress.completedDayCount == 5)
        #expect(progress.recentDays.count == 7)
        #expect(progress.recentDays.filter(\.isComplete).count == 3)
    }

    @Test("Empty, duplicate, zero and future entries do not inflate streaks")
    func boundaries() async throws {
        let empty = try await summary(days: [])
        #expect(empty.currentStreak == 0)
        #expect(empty.longestStreak == 0)
        let duplicate = try await summary(days: [0, 0, -1, 1, 2])
        #expect(duplicate.currentStreak == 2)
        #expect(duplicate.completedDayCount == 2)
        let zero = try await summary(days: [0, -1], value: 0)
        #expect(zero.currentStreak == 0)
    }

    @Test("History can span years rather than only the displayed week")
    func yearsOfHistory() async throws {
        let progress = try await summary(days: (0..<800).map { -$0 })
        #expect(progress.currentStreak == 800)
        #expect(progress.longestStreak == 800)
        #expect(progress.completedDayCount == 800)
        #expect(progress.recentDays.count == 7)
    }

    @Test("Consecutive calendar days remain consecutive across daylight saving")
    func daylightSaving() async throws {
        let zone = try #require(TimeZone(identifier: "America/New_York"))
        let progress = try await summary(days: [0, -1, -2], timeZone: zone)
        #expect(progress.currentStreak == 3)
        #expect(progress.longestStreak == 3)
    }

    private func summary(days: [Int], value: Int = 1, target: Int? = nil,
                         timeZone: TimeZone? = nil) async throws -> HabitStreakSummary {
        var calendar = Calendar(identifier: .gregorian)
        let utc = try #require(TimeZone(secondsFromGMT: 0))
        calendar.timeZone = timeZone ?? utc
        let today = try #require(calendar.date(from: DateComponents(year: 2026, month: 11, day: 2)))
        let entries = try days.map { offset in
            HabitEntry(id: UUID(), date: try #require(calendar.date(byAdding: .day, value: offset, to: today)), value: value)
        }
        let habit = Habit(id: UUID(), name: "Pull ups", tracking: .count, unit: "reps", dailyTarget: target, entries: entries)
        let habitsFeature = HabitsFeature(repository: InMemoryHabitsRepository(habits: [habit]))
        await habitsFeature.reload()
        let dayStreakFeature = DayStreakFeature(habitsFeature: habitsFeature, calendar: calendar, currentDate: { today })
        return try #require(dayStreakFeature.summaries.first)
    }
}
