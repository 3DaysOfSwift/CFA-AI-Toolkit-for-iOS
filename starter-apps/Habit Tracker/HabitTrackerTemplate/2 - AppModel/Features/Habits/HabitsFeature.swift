import Foundation
import Observation

@MainActor
@Observable
final class HabitsFeature {
    @ObservationIgnored private var reloadTask: Task<Void, Never>?
    @ObservationIgnored private var operationTask: Task<Void, Error>?
    @ObservationIgnored private var operationID: UUID?
    private let repository: any HabitsRepository
    private let calendar: Calendar
    private let currentDate: () -> Date
    private(set) var habits: [Habit] = []
    private(set) var isLoading = false
    private(set) var loadError: (any Error)?

    init(repository: any HabitsRepository, calendar: Calendar = .autoupdatingCurrent,
         currentDate: @escaping () -> Date = { .now }) {
        self.repository = repository
        self.calendar = calendar
        self.currentDate = currentDate
    }

    var today: Date { currentDate() }

    func valueToday(for habit: Habit) -> Int {
        habit.value(on: today, calendar: calendar)
    }

    func isCompleteToday(_ habit: Habit) -> Bool {
        habit.isComplete(on: today, calendar: calendar)
    }

    func startLoading() {
        _ = startReloadIfNeeded()
    }

    func reload() async {
        await startReloadIfNeeded().value
    }

    private func startReloadIfNeeded() -> Task<Void, Never> {
        if let reloadTask { return reloadTask }
        let task = Task { @MainActor in
            defer { reloadTask = nil }
            do {
                try await enqueue {
                    self.isLoading = true
                    defer { self.isLoading = false }
                    do {
                        self.habits = try await self.repository.fetchHabits()
                        self.loadError = nil
                    } catch {
                        self.loadError = error
                    }
                }
            } catch {
                loadError = error
            }
        }
        reloadTask = task
        return task
    }

    func addHabit(name: String, tracking: HabitTracking, unit: String, dailyTarget: Int?) async throws {
        let cleanedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedName.isEmpty else { throw HabitError.invalidName }
        if let dailyTarget, dailyTarget < 1 { throw HabitError.invalidTarget }
        let habit = Habit(id: UUID(), name: cleanedName, tracking: tracking,
                          unit: unit.trimmingCharacters(in: .whitespacesAndNewlines),
                          dailyTarget: dailyTarget, entries: [])
        try await enqueue {
            try await self.repository.insertHabit(habit)
            self.habits.append(habit)
            self.habits.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
    }

    func recordToday(habitID: UUID, value: Int) async throws {
        guard value >= 0 else { throw HabitError.invalidEntry }
        try await enqueue {
            guard let index = self.habits.firstIndex(where: { $0.id == habitID }) else { throw HabitError.habitNotFound }
            let day = self.calendar.startOfDay(for: self.currentDate())
            var entries = self.habits[index].entries
            let existingIndex = entries.firstIndex(where: { self.calendar.isDate($0.date, inSameDayAs: day) })
            let entryID = existingIndex.map { entries[$0].id } ?? UUID()
            try await self.repository.record(habitID: habitID, entryID: entryID, date: day, value: value)
            if let entryIndex = existingIndex {
                if value == 0 { entries.remove(at: entryIndex) }
                else { entries[entryIndex] = HabitEntry(id: entries[entryIndex].id, date: entries[entryIndex].date, value: value) }
            } else if value > 0 {
                entries.append(HabitEntry(id: entryID, date: day, value: value))
            }
            self.habits[index] = self.habits[index].replacingEntries(entries)
        }
    }

    // Every admitted change completes before the next one reads or publishes state.
    private func enqueue(_ work: @escaping @MainActor () async throws -> Void) async throws {
        let previous = operationTask
        let id = UUID()
        let task = Task { @MainActor in
            _ = try? await previous?.value
            try await work()
        }
        operationTask = task
        operationID = id
        defer {
            if operationID == id { operationTask = nil; operationID = nil }
        }
        try await task.value
    }
}
