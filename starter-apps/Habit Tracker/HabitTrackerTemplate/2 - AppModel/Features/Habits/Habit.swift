import Foundation

enum HabitTracking: String, CaseIterable, Identifiable, Equatable, Hashable, Sendable {
    case completion
    case count

    var id: String { rawValue }
}

struct Habit: Identifiable, Equatable, Sendable {
    let id: UUID
    let name: String
    let tracking: HabitTracking
    let unit: String
    let dailyTarget: Int?
    let entries: [HabitEntry]

    func replacingEntries(_ entries: [HabitEntry]) -> Self {
        Self(id: id, name: name, tracking: tracking, unit: unit,
             dailyTarget: dailyTarget, entries: entries)
    }

    func value(on day: Date, calendar: Calendar) -> Int {
        entries.first(where: { calendar.isDate($0.date, inSameDayAs: day) })?.value ?? 0
    }

    func isComplete(on day: Date, calendar: Calendar) -> Bool {
        let value = value(on: day, calendar: calendar)
        guard let dailyTarget else { return value > 0 }
        return value >= dailyTarget
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
    case habitNotFound

    var errorDescription: String? {
        switch self {
        case .invalidName: "Enter a name for this habit."
        case .invalidTarget: "The daily target must be greater than zero."
        case .invalidEntry: "A recorded amount cannot be negative."
        case .habitNotFound: "This habit is no longer available."
        }
    }
}
