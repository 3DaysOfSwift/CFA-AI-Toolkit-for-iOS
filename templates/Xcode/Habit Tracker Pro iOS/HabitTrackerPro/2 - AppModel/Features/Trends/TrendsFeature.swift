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
    private let purchasesFeature: PurchasesFeature
    private let calendar: Calendar
    private let currentDate: () -> Date

    init(habitsFeature: HabitsFeature, purchasesFeature: PurchasesFeature,
         calendar: Calendar = .current, currentDate: @escaping () -> Date = { .now }) {
        self.habitsFeature = habitsFeature
        self.purchasesFeature = purchasesFeature
        self.calendar = calendar
        self.currentDate = currentDate
    }

    var hasAccess: Bool { purchasesFeature.hasTrendsAccess }
    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: String? { habitsFeature.loadError }
    func reload() async { await habitsFeature.reload() }

    /// Paid calculations are guarded here, not only in the screen.
    /// No duplicate habit collection or second persistent store.
    var trends: [HabitTrend] {
        guard hasAccess else { return [] }
        let today = calendar.startOfDay(for: currentDate())
        return habitsFeature.habits.map { habit in
            var amounts: [Date: Int] = [:]
            for entry in habit.entries {
                let day = calendar.startOfDay(for: entry.date)
                guard day <= today else { continue }
                amounts[day] = max(amounts[day] ?? 0, entry.value)
            }
            let days = (-29...0).compactMap { offset -> TrendDay? in
                guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { return nil }
                let value = amounts[day] ?? 0
                let completed = value > 0 && value >= (habit.dailyTarget ?? 1)
                return TrendDay(date: day, value: value, isComplete: completed)
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
