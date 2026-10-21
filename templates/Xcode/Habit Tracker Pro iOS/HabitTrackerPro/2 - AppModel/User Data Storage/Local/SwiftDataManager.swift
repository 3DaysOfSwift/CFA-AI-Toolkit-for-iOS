import Foundation
import SwiftData

actor SwiftDataManager: HabitsRepository {
    private var habitRepository: HabitRepository?

    private func repository() throws -> HabitRepository {
        if let habitRepository { return habitRepository }
        let container = try ModelContainer(for: StoredHabit.self, StoredHabitEntry.self)
        let repository = HabitRepository(modelContainer: container)
        habitRepository = repository
        return repository
    }

    func fetchHabits() async throws -> [Habit] {
        try await repository().fetchHabits()
    }

    func insertHabit(_ habit: Habit) async throws {
        try await repository().insertHabit(habit)
    }

    func record(habitID: UUID, date: Date, value: Int) async throws {
        try await repository().record(habitID: habitID, date: date, value: value)
    }
}
