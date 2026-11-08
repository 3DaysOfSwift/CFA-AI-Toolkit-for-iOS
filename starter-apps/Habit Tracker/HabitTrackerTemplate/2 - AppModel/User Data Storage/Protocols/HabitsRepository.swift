import Foundation

protocol HabitsRepository: Sendable {
    func fetchHabits() async throws -> [Habit]
    func insertHabit(_ habit: Habit) async throws
    // Update or remove the selected entry by ID; date is used when inserting.
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws
}
