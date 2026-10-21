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
