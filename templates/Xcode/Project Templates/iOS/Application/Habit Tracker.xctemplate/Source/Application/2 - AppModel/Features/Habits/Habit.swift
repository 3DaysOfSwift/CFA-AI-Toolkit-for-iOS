import Foundation

enum HabitTracking: String, CaseIterable, Identifiable, Equatable, Hashable, Sendable {
    case completion
    case count

    var id: String { rawValue }
}

struct Habit: Identifiable, Equatable, Sendable {
    let id: UUID
    var name: String
    var tracking: HabitTracking
    var unit: String
    var dailyTarget: Int?
    var entries: [HabitEntry]

    var todayValue: Int {
        entries.first(where: { Calendar.current.isDateInToday($0.date) })?.value ?? 0
    }

    var isCompleteToday: Bool {
        guard let dailyTarget else { return todayValue > 0 }
        return todayValue >= dailyTarget
    }

    func currentStreak(calendar: Calendar = .current, today: Date = .now) -> Int {
        let completedDays = Set(entries.filter { entry in
            guard entry.value > 0 else { return false }
            return dailyTarget.map { entry.value >= $0 } ?? true
        }.map { calendar.startOfDay(for: $0.date) })
        var day = calendar.startOfDay(for: today)
        if !completedDays.contains(day), let yesterday = calendar.date(byAdding: .day, value: -1, to: day) {
            day = yesterday
        }

        var streak = 0
        while completedDays.contains(day) {
            streak += 1
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previousDay
        }
        return streak
    }
}

struct HabitEntry: Identifiable, Equatable, Sendable {
    let id: UUID
    let date: Date
    let value: Int
}

enum HabitError: LocalizedError {
    case invalidName
    case invalidTarget
    case invalidEntry

    var errorDescription: String? {
        switch self {
        case .invalidName: "Enter a name for this habit."
        case .invalidTarget: "The daily target must be greater than zero."
        case .invalidEntry: "A recorded amount cannot be negative."
        }
    }
}
