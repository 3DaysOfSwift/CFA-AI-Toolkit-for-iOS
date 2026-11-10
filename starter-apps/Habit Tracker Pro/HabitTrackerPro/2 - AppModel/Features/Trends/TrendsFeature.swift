import Foundation
import Observation

struct TrendDay: Identifiable, Sendable {
    let date: Date
    let value: Int
    let isComplete: Bool
    var id: Date { date }
}

struct TrendWeek: Identifiable, Sendable {
    let start: Date
    let completedDayCount: Int
    var id: Date { start }
}

struct HabitTrend: Identifiable, Sendable {
    let id: UUID
    let name: String
    let unit: String
    let dailyTarget: Int?
    let days: [TrendDay]
    let weeks: [TrendWeek]
    let completedDayCount: Int
}

@MainActor
@Observable
final class TrendsFeature {
    private let habitsFeature: HabitsFeature
    private let calendar: Calendar
    private let currentDate: () -> Date

    init(habitsFeature: HabitsFeature,
         calendar: Calendar = .autoupdatingCurrent, currentDate: @escaping () -> Date = { .now }) {
        self.habitsFeature = habitsFeature
        self.calendar = calendar
        self.currentDate = currentDate
    }

    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: (any Error)? { habitsFeature.loadError }
    func reload() async { await habitsFeature.reload() }

    /// Calculate trends from the habits already owned by HabitsFeature.
    var trends: [HabitTrend] {
        let today = calendar.startOfDay(for: currentDate())
        return habitsFeature.habits.map { habit in
            let days = (-29...0).compactMap { offset -> TrendDay? in
                guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { return nil }
                return TrendDay(
                    date: day,
                    value: habit.value(on: day, calendar: calendar),
                    isComplete: habit.isComplete(on: day, calendar: calendar)
                )
            }
            // Four complete seven-day windows, ending today. These are not
            // calendar weeks; their meaning does not depend on locale settings.
            let weeks = stride(from: 2, to: 30, by: 7).map { start in
                let window = Array(days.dropFirst(start).prefix(7))
                return TrendWeek(start: window.first?.date ?? today,
                                 completedDayCount: window.filter(\.isComplete).count)
            }
            return HabitTrend(id: habit.id, name: habit.name,
                              unit: habit.tracking == .completion ? "Completion" : habit.unit,
                              dailyTarget: habit.dailyTarget, days: days, weeks: weeks,
                              completedDayCount: days.filter(\.isComplete).count)
        }
    }
}
