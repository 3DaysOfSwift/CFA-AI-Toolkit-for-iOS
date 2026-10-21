import Foundation
import Observation

/// Owns daily progress and completion behaviour. HabitsFeature remains the
/// single owner of saved habits, so both tabs observe the same committed data.
@MainActor
@Observable
final class TodayFeature {
    private let habitsFeature: HabitsFeature

    init(habitsFeature: HabitsFeature) {
        self.habitsFeature = habitsFeature
    }

    var habits: [Habit] { habitsFeature.habits }
    var completedCount: Int { habits.filter(\.isCompleteToday).count }
    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: String? { habitsFeature.loadError }

    func reload() async { await habitsFeature.reload() }

    func valueForTogglingCompletion(habitID: UUID) -> Int? {
        guard let habit = habits.first(where: { $0.id == habitID }) else { return nil }
        return habit.isCompleteToday ? 0 : (habit.dailyTarget ?? 1)
    }

    func recordToday(habitID: UUID, value: Int) async throws {
        try await habitsFeature.recordToday(habitID: habitID, value: value)
    }
}
