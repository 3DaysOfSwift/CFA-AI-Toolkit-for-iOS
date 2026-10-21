import Foundation
import SwiftData

@ModelActor
actor HabitRepository: HabitsRepository {
    func fetchHabits() async throws -> [Habit] {
        let storedHabits = try modelContext.fetch(FetchDescriptor<StoredHabit>())
        let storedEntries = try modelContext.fetch(FetchDescriptor<StoredHabitEntry>())
        let entriesByHabit = Dictionary(grouping: storedEntries, by: \.habitID)

        return try storedHabits.map { stored in
            guard let tracking = HabitTracking(rawValue: stored.trackingRawValue) else {
                throw HabitStorageError.invalidTrackingValue
            }
            let entries = (entriesByHabit[stored.id] ?? []).map {
                HabitEntry(id: $0.id, date: $0.date, value: $0.value)
            }
            return Habit(id: stored.id, name: stored.name, tracking: tracking,
                         unit: stored.unit, dailyTarget: stored.dailyTarget, entries: entries)
        }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func insertHabit(_ habit: Habit) async throws {
        modelContext.insert(StoredHabit(id: habit.id, name: habit.name,
                                        trackingRawValue: habit.tracking.rawValue,
                                        unit: habit.unit, dailyTarget: habit.dailyTarget))
        try modelContext.save()
    }

    func record(habitID: UUID, date: Date, value: Int) async throws {
        let habitID = habitID
        let descriptor = FetchDescriptor<StoredHabitEntry>(
            predicate: #Predicate { $0.habitID == habitID && $0.date == date }
        )
        if let existing = try modelContext.fetch(descriptor).first {
            if value == 0 {
                modelContext.delete(existing)
            } else {
                existing.value = value
            }
        } else if value > 0 {
            modelContext.insert(StoredHabitEntry(id: UUID(), habitID: habitID, date: date, value: value))
        }
        try modelContext.save()
    }
}

enum HabitStorageError: LocalizedError {
    case invalidTrackingValue

    var errorDescription: String? {
        switch self {
        case .invalidTrackingValue:
            "A saved habit has an unsupported tracking type. Its data was left unchanged."
        }
    }
}
