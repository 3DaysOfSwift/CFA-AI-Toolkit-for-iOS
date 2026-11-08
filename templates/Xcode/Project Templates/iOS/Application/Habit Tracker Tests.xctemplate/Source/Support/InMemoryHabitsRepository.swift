import Foundation

@testable import ___PROJECTNAME:identifier___

actor InMemoryHabitsRepository: HabitsRepository {
    private var stored: [Habit]

    init(habits: [Habit] = []) {
        stored = habits
    }

    func fetchHabits() async throws -> [Habit] { stored }

    func insertHabit(_ habit: Habit) async throws {
        stored.append(habit)
    }

    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {
        guard stored.contains(where: { $0.id == habitID }) else { throw HabitError.habitNotFound }
        if let index = stored.firstIndex(where: { $0.id == habitID }) {
            var entries = stored[index].entries
            if let entryIndex = entries.firstIndex(where: { $0.id == entryID }) {
                if value == 0 { entries.remove(at: entryIndex) }
                else { entries[entryIndex] = HabitEntry(id: entries[entryIndex].id, date: entries[entryIndex].date, value: value) }
            } else if value > 0 {
                entries.append(HabitEntry(id: entryID, date: date, value: value))
            }
            stored[index] = stored[index].replacingEntries(entries)
        }
    }

}
