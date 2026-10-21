import Foundation
import Observation

@MainActor
@Observable
final class HabitsFeature {
    private let repository: any HabitsRepository
    private(set) var habits: [Habit] = []
    private(set) var isLoading = false
    private(set) var loadError: String?

    init(repository: any HabitsRepository) {
        self.repository = repository
    }

    func reload() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            habits = try await repository.fetchHabits()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    func addHabit(name: String, tracking: HabitTracking, unit: String, dailyTarget: Int?) async throws {
        let cleanedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedName.isEmpty else { throw HabitError.invalidName }
        if let dailyTarget, dailyTarget < 1 { throw HabitError.invalidTarget }

        let habit = Habit(
            id: UUID(), name: cleanedName, tracking: tracking,
            unit: unit.trimmingCharacters(in: .whitespacesAndNewlines),
            dailyTarget: dailyTarget, entries: []
        )
        try await repository.insertHabit(habit)
        habits.append(habit)
        habits.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func recordToday(habitID: UUID, value: Int) async throws {
        guard let index = habits.firstIndex(where: { $0.id == habitID }) else { return }
        guard value >= 0 else { throw HabitError.invalidEntry }
        let day = Calendar.current.startOfDay(for: .now)
        try await repository.record(habitID: habitID, date: day, value: value)

        if let entryIndex = habits[index].entries.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: day) }) {
            habits[index].entries[entryIndex] = HabitEntry(id: habits[index].entries[entryIndex].id, date: day, value: value)
        } else if value > 0 {
            habits[index].entries.append(HabitEntry(id: UUID(), date: day, value: value))
        }
    }
}
