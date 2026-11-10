import Foundation
import SwiftData

actor SwiftDataManager: HabitsRepository {
    private let configuration: ModelConfiguration
    private var habitStore: HabitStore?

    init(configuration: ModelConfiguration = ModelConfiguration(for: StoredHabit.self, StoredHabitEntry.self)) {
        self.configuration = configuration
    }

    private func store() throws -> HabitStore {
        if let habitStore { return habitStore }

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
        let store = HabitStore(modelContainer: container)
        habitStore = store
        return store
    }

    func fetchHabits() async throws -> [Habit] {
        try await store().fetchHabits()
    }

    func insertHabit(_ habit: Habit) async throws {
        try await store().insertHabit(habit)
    }

    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {
        try await store().record(habitID: habitID, entryID: entryID, date: date, value: value)
    }
}
