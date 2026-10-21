import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

@Suite("Habit streak rules")
struct HabitStreakTests {
    @Test("Streak includes today or continues from yesterday")
    func currentStreak() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let today = try #require(calendar.date(from: DateComponents(year: 2026, month: 10, day: 21)))
        let dates = try (0..<3).map { offset in
            try #require(calendar.date(byAdding: .day, value: -offset, to: today))
        }
        let habit = Habit(id: UUID(), name: "Running", tracking: .completion,
                          unit: "", dailyTarget: nil,
                          entries: dates.map { HabitEntry(id: UUID(), date: $0, value: 1) })

        #expect(habit.currentStreak(calendar: calendar, today: today) == 3)
    }

    @Test("An unmet daily target does not count as a complete streak day")
    func targetMustBeReached() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let today = try #require(calendar.date(from: DateComponents(year: 2026, month: 10, day: 21)))
        let habit = Habit(id: UUID(), name: "Pull ups", tracking: .count,
                          unit: "reps", dailyTarget: 10,
                          entries: [HabitEntry(id: UUID(), date: today, value: 5)])

        #expect(habit.currentStreak(calendar: calendar, today: today) == 0)
    }
}
