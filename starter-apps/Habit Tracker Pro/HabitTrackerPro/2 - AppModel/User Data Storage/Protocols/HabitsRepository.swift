import Foundation

protocol HabitsRepository: Sendable {
    func fetchHabits() async throws -> [Habit]
    func insertHabit(_ habit: Habit) async throws
    func record(habitID: UUID, date: Date, value: Int) async throws
}
