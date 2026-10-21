import Foundation
import Observation

struct StreakDay: Identifiable, Sendable {
    let date: Date
    let isComplete: Bool
    var id: Date { date }
}

struct HabitStreakSummary: Identifiable, Sendable {
    let id: UUID
    let name: String
    let currentStreak: Int
    let longestStreak: Int
    let completedDayCount: Int
    let recentDays: [StreakDay]
}

/// Interprets habit history without owning or duplicating the saved habits.
@MainActor
@Observable
final class DayStreakFeature {
    private let habitsFeature: HabitsFeature
    private let calendar: Calendar
    private let currentDate: () -> Date

    init(habitsFeature: HabitsFeature, calendar: Calendar = .current,
         currentDate: @escaping () -> Date = { .now }) {
        self.habitsFeature = habitsFeature
        self.calendar = calendar
        self.currentDate = currentDate
    }

    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: String? { habitsFeature.loadError }
    func reload() async { await habitsFeature.reload() }

    var summaries: [HabitStreakSummary] {
        let today = calendar.startOfDay(for: currentDate())
        return habitsFeature.habits.map { summary(for: $0, today: today) }
    }

    private func summary(for habit: Habit, today: Date) -> HabitStreakSummary {
        let completedDays = Set(habit.entries.compactMap { entry -> Date? in
            let day = calendar.startOfDay(for: entry.date)
            guard day <= today, entry.value > 0,
                  habit.dailyTarget.map({ entry.value >= $0 }) ?? true else { return nil }
            return day
        })
        var day = today
        if !completedDays.contains(day), let yesterday = calendar.date(byAdding: .day, value: -1, to: today) {
            day = yesterday
        }
        var currentStreak = 0
        while completedDays.contains(day) {
            currentStreak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }

        var longestStreak = 0
        var run = 0
        var previousDay: Date?
        for completedDay in completedDays.sorted() {
            if let previousDay, calendar.date(byAdding: .day, value: 1, to: previousDay) == completedDay {
                run += 1
            } else {
                run = 1
            }
            longestStreak = max(longestStreak, run)
            previousDay = completedDay
        }
        let recentDays = (-6...0).compactMap { offset -> StreakDay? in
            guard let date = calendar.date(byAdding: .day, value: offset, to: today) else { return nil }
            return StreakDay(date: date, isComplete: completedDays.contains(date))
        }
        return HabitStreakSummary(id: habit.id, name: habit.name, currentStreak: currentStreak,
                                  longestStreak: longestStreak, completedDayCount: completedDays.count,
                                  recentDays: recentDays)
    }
}
