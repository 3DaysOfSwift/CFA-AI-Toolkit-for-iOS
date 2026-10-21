import Foundation
import SwiftData

actor SwiftDataManager: HabitsRepository {
    private let configuration: ModelConfiguration
    private var habitRepository: HabitRepository?

    init(configuration: ModelConfiguration = ModelConfiguration(for: StoredHabit.self, StoredHabitEntry.self)) {
        self.configuration = configuration
    }

    private func repository() throws -> HabitRepository {
        if let habitRepository { return habitRepository }

        // Prepare the actual configured location, without moving existing stores.
        // Directory failures must reach the requesting feature before SwiftData opens.
        if !configuration.isStoredInMemoryOnly {
            let storeDirectory = configuration.url.deletingLastPathComponent()
            try FileManager.default.createDirectory(
                at: storeDirectory,
                withIntermediateDirectories: true
            )
        }
        let container = try ModelContainer(
            for: StoredHabit.self, StoredHabitEntry.self,
            configurations: configuration
        )
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
