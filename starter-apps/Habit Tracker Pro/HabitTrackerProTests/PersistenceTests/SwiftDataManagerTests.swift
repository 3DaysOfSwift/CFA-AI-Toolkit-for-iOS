import Foundation
import SwiftData
import Testing

@testable import HabitTrackerPro

// Only these disk fixtures run sequentially to avoid overlapping independent
// SwiftData schema initialization. Other feature and ViewModel suites stay parallel.
@Suite("SwiftData store preparation", .serialized)
struct SwiftDataManagerTests {
    @Test("A missing stored habit cannot accept an entry")
    func rejectsEntryForMissingHabit() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        let manager = SwiftDataManager(configuration: fixture.configuration)
        await #expect(throws: HabitError.habitNotFound) {
            try await manager.record(habitID: UUID(), entryID: UUID(), date: .now, value: 1)
        }
        #expect(try await manager.fetchHabits().isEmpty)
    }

    @Test("The explicit default configuration keeps the existing store location")
    func preservesDefaultStoreLocation() {
        let configuration = ModelConfiguration(for: StoredHabit.self, StoredHabitEntry.self)
        #expect(configuration.url == ModelConfiguration().url)
        #expect(!configuration.isStoredInMemoryOnly)
    }

    @Test("First use creates missing directories and saves data that survives reopening")
    func preparesAndReopensStore() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        let manager = SwiftDataManager(configuration: fixture.configuration)
        #expect(!FileManager.default.fileExists(atPath: fixture.storeDirectory.path))

        let initialHabits = try await manager.fetchHabits()
        #expect(initialHabits.isEmpty)
        #expect(FileManager.default.fileExists(atPath: fixture.storeURL.path))

        let habit = Habit(id: UUID(), name: "Pull ups", tracking: .count,
                          unit: "reps", dailyTarget: 10, entries: [])
        try await manager.insertHabit(habit)
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let entryID = UUID()
        try await manager.record(habitID: habit.id, entryID: entryID, date: date, value: 14)

        let reopenedManager = SwiftDataManager(configuration: fixture.configuration)
        let savedHabits = try await reopenedManager.fetchHabits()
        let savedHabit = try #require(savedHabits.first)
        #expect(savedHabits.count == 1)
        #expect(savedHabit.id == habit.id)
        #expect(savedHabit.name == "Pull ups")
        #expect(savedHabit.entries.count == 1)
        #expect(savedHabit.entries.first?.id == entryID)
        #expect(savedHabit.entries.first?.value == 14)
    }

    @Test("Updating a same-day entry preserves its identity and can delete it")
    @MainActor
    func updatesExistingNonMidnightEntry() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        let manager = SwiftDataManager(configuration: fixture.configuration)
        let habit = Habit(id: UUID(), name: "Walk", tracking: .count,
                          unit: "steps", dailyTarget: 10, entries: [])
        try await manager.insertHabit(habit)
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: Date(timeIntervalSince1970: 1_700_000_000))
        let recordedAt = try #require(calendar.date(byAdding: .hour, value: 12, to: day))
        let entryID = UUID()
        try await manager.record(habitID: habit.id, entryID: entryID, date: recordedAt, value: 3)

        let feature = HabitsFeature(repository: manager, calendar: calendar, currentDate: { recordedAt })
        await feature.reload()
        try await feature.recordToday(habitID: habit.id, value: 7)
        let updated = try #require(feature.habits.first?.entries.first)
        #expect(updated.id == entryID && updated.date == recordedAt && updated.value == 7)
        let stored = try await manager.fetchHabits()
        #expect(stored.first?.entries == [updated])

        try await feature.recordToday(habitID: habit.id, value: 0)
        #expect(feature.habits.first?.entries.isEmpty == true)
        let afterDelete = try await manager.fetchHabits()
        #expect(afterDelete.first?.entries.isEmpty == true)
    }

    @Test("A file blocking the store directory is preserved and the same manager can retry")
    func directoryFailureAndRetry() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        let marker = Data("Keep this existing file".utf8)
        try marker.write(to: fixture.blockingURL)
        let manager = SwiftDataManager(configuration: fixture.configuration)

        do {
            _ = try await manager.fetchHabits()
            Issue.record("A blocked directory must throw, not return an empty collection")
        } catch {
            #expect(error is CocoaError)
        }
        #expect(try Data(contentsOf: fixture.blockingURL) == marker)
        #expect(!FileManager.default.fileExists(atPath: fixture.storeURL.path))

        // Only the fixture owner removes its synthetic blocker; production never does.
        try FileManager.default.removeItem(at: fixture.blockingURL)
        let habits = try await manager.fetchHabits()
        #expect(habits.isEmpty)
        #expect(FileManager.default.fileExists(atPath: fixture.storeURL.path))
    }

    @Test("Overlapping first reads share a store and remain usable for subsequent writes")
    func overlappingFirstReads() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        let manager = SwiftDataManager(configuration: fixture.configuration)
        async let first = manager.fetchHabits()
        async let second = manager.fetchHabits()
        let results = try await (first, second)
        #expect(results.0.isEmpty)
        #expect(results.1.isEmpty)

        let habit = Habit(id: UUID(), name: "Walk", tracking: .completion,
                          unit: "", dailyTarget: nil, entries: [])
        try await manager.insertHabit(habit)
        let savedHabits = try await manager.fetchHabits()
        #expect(savedHabits.map(\.id) == [habit.id])
    }

    @Test("Directory failures are feature request errors and clear after a successful retry")
    @MainActor
    func featureFailureAndRetry() async throws {
        let fixture = try StoreFixture()
        defer { fixture.remove() }
        try Data("Blocked".utf8).write(to: fixture.blockingURL)
        let feature = HabitsFeature(repository: SwiftDataManager(configuration: fixture.configuration))

        await feature.reload()
        #expect(feature.loadError != nil)
        #expect(!feature.isLoading)

        try FileManager.default.removeItem(at: fixture.blockingURL)
        await feature.reload()
        #expect(feature.loadError == nil)
        #expect(!feature.isLoading)
    }
}

private struct StoreFixture {
    let directory: URL

    init() throws {
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SwiftDataManagerTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    var blockingURL: URL { directory.appendingPathComponent("Library", isDirectory: true) }
    var storeDirectory: URL { blockingURL.appendingPathComponent("Application Support", isDirectory: true) }
    var storeURL: URL { storeDirectory.appendingPathComponent("default.store") }
    var configuration: ModelConfiguration {
        ModelConfiguration(url: storeURL, cloudKitDatabase: .none)
    }

    func remove() {
        // SwiftData may keep its SQLite store open after the last operation.
        // Leave created stores in the system temporary directory for OS cleanup.
        guard !FileManager.default.fileExists(atPath: storeURL.path) else { return }
        do {
            try FileManager.default.removeItem(at: directory)
        } catch {
            Issue.record("Could not remove temporary store fixture: \(error)")
        }
    }
}
