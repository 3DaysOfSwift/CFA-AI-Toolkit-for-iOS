import Foundation

@testable import HabitTrackerTemplate

actor InMemoryHabitsRepository: HabitsRepository {
    private var stored: [Habit]
    private var lastInserted: Habit?
    private var insertWaiter: CheckedContinuation<Habit, Never>?
    private var lastRecorded: (UUID, Int)?
    private var recordWaiter: CheckedContinuation<(UUID, Int), Never>?

    init(habits: [Habit] = []) {
        stored = habits
    }

    func fetchHabits() async throws -> [Habit] { stored }

    func insertHabit(_ habit: Habit) async throws {
        stored.append(habit)
        lastInserted = habit
        insertWaiter?.resume(returning: habit)
        insertWaiter = nil
    }

    func record(habitID: UUID, date: Date, value: Int) async throws {
        lastRecorded = (habitID, value)
        recordWaiter?.resume(returning: (habitID, value))
        recordWaiter = nil
    }

    func waitForInsert() async -> Habit {
        if let lastInserted { return lastInserted }
        return await withCheckedContinuation { insertWaiter = $0 }
    }

    func waitForRecord() async -> (UUID, Int) {
        if let lastRecorded { return lastRecorded }
        return await withCheckedContinuation { recordWaiter = $0 }
    }
}
