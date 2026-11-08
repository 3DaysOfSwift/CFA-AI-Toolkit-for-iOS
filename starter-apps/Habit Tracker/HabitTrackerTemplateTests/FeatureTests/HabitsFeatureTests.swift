import Foundation
import Testing

@testable import HabitTrackerTemplate

private actor FailingHabitsRepository: HabitsRepository {
    enum Failure: LocalizedError {
        case cannotOpen
        var errorDescription: String? { "Database unavailable" }
    }

    func fetchHabits() async throws -> [Habit] { throw Failure.cannotOpen }
    func insertHabit(_ habit: Habit) async throws { throw Failure.cannotOpen }
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws { throw Failure.cannotOpen }
}


private actor PausedRecordRepository: HabitsRepository {
    private var stored: [Habit]
    private var recordStarted = false
    private var startedWaiter: CheckedContinuation<Void, Never>?
    private var releaseWaiter: CheckedContinuation<Void, Never>?

    init(habit: Habit) { stored = [habit] }
    func fetchHabits() async throws -> [Habit] { stored }
    func insertHabit(_ habit: Habit) async throws { stored.append(habit) }
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {
        recordStarted = true
        startedWaiter?.resume()
        startedWaiter = nil
        await withCheckedContinuation { releaseWaiter = $0 }
        guard let index = stored.firstIndex(where: { $0.id == habitID }) else { return }
        stored[index] = stored[index].replacingEntries([HabitEntry(id: entryID, date: date, value: value)])
    }
    func waitForRecord() async {
        if recordStarted { return }
        await withCheckedContinuation { startedWaiter = $0 }
    }
    func releaseRecord() { releaseWaiter?.resume(); releaseWaiter = nil }
}

private actor RejectingRecordRepository: HabitsRepository {
    let habit: Habit
    init(habit: Habit) { self.habit = habit }
    func fetchHabits() async throws -> [Habit] { [habit] }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws { throw HabitError.invalidEntry }
}

@Suite("Habits feature")
@MainActor
struct HabitsFeatureTests {
    @Test("Loading failure stays in the feature for the screen to present")
    func reportsLoadingFailure() async {
        let feature = HabitsFeature(repository: FailingHabitsRepository())
        await feature.reload()
        #expect(feature.loadError == "Database unavailable")
        #expect(feature.habits.isEmpty)
        #expect(!feature.isLoading)
    }

    @Test("Add validates a habit name before saving")
    func rejectsEmptyName() async {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())

        await #expect(throws: HabitError.invalidName) {
            try await feature.addHabit(name: "  ", tracking: .completion, unit: "", dailyTarget: nil)
        }
        #expect(feature.habits.isEmpty)
    }

    @Test("A saved habit is published after storage succeeds")
    func addsHabit() async throws {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        try await feature.addHabit(name: "  Running ", tracking: .completion, unit: "", dailyTarget: nil)

        #expect(feature.habits.map(\.name) == ["Running"])
    }

    @Test("Recording an unavailable habit reports an error")
    func missingHabitDoesNotReportSuccess() async {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        await #expect(throws: HabitError.habitNotFound) {
            try await feature.recordToday(habitID: UUID(), value: 1)
        }
        #expect(feature.habits.isEmpty)
    }

    @Test("The test repository rejects entries for missing habits")
    func testRepositoryRejectsMissingHabit() async {
        let repository = InMemoryHabitsRepository()
        await #expect(throws: HabitError.habitNotFound) {
            try await repository.record(habitID: UUID(), entryID: UUID(), date: .now, value: 1)
        }
    }
    @Test("Overlapping changes keep the saved entry with its original habit", .timeLimit(.minutes(1)))
    func overlappingChangesKeepTheSameOwner() async throws {
        let habit = Habit(id: UUID(), name: "Zebra", tracking: .count, unit: "", dailyTarget: nil, entries: [])
        let repository = PausedRecordRepository(habit: habit)
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let originalSnapshot = try #require(feature.habits.first)
        let record = Task { try await feature.recordToday(habitID: habit.id, value: 3) }
        await repository.waitForRecord()
        let (insertionStarted, signalInsertion) = AsyncStream<Void>.makeStream()
        let insertion = Task {
            signalInsertion.yield(())
            signalInsertion.finish()
            try await feature.addHabit(name: "Alpha", tracking: .completion, unit: "", dailyTarget: nil)
        }
        var iterator = insertionStarted.makeAsyncIterator()
        _ = await iterator.next()
        await repository.releaseRecord()
        try await record.value
        try await insertion.value
        let original = try #require(feature.habits.first(where: { $0.id == habit.id }))
        let added = try #require(feature.habits.first(where: { $0.name == "Alpha" }))
        #expect(original.entries.first?.value == 3)
        #expect(originalSnapshot.entries.isEmpty)
        #expect(added.entries.isEmpty)
        #expect(feature.habits.first?.name == "Alpha")
    }

    @Test("A saved entry keeps its identity after reload")
    func savedEntryIdentitySurvivesReload() async throws {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        try await feature.addHabit(name: "Walk", tracking: .count, unit: "", dailyTarget: nil)
        let habit = try #require(feature.habits.first)
        try await feature.recordToday(habitID: habit.id, value: 2)
        let entryID = try #require(feature.habits.first?.entries.first?.id)
        await feature.reload()
        #expect(feature.habits.first?.entries.first?.id == entryID)
    }

    @Test("A cleared entry stays cleared after reloading")
    func clearingEntrySurvivesReload() async throws {
        let feature = HabitsFeature(repository: InMemoryHabitsRepository())
        try await feature.addHabit(name: "Walk", tracking: .count, unit: "", dailyTarget: nil)
        let habit = try #require(feature.habits.first)
        try await feature.recordToday(habitID: habit.id, value: 2)
        try await feature.recordToday(habitID: habit.id, value: 0)
        #expect(feature.habits.first?.entries.isEmpty == true)
        await feature.reload()
        #expect(feature.habits.first?.entries.isEmpty == true)
    }

    @Test("A failed write leaves the saved snapshot unchanged")
    func failedWriteDoesNotPublish() async throws {
        let habit = Habit(id: UUID(), name: "Walk", tracking: .count, unit: "", dailyTarget: nil, entries: [])
        let feature = HabitsFeature(repository: RejectingRecordRepository(habit: habit))
        await feature.reload()
        await #expect(throws: HabitError.invalidEntry) {
            try await feature.recordToday(habitID: habit.id, value: 2)
        }
        #expect(feature.habits == [habit])
    }

}
