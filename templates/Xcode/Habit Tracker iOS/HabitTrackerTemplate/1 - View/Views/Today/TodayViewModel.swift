import Foundation
import Observation

@MainActor
@Observable
final class TodayViewModel {
    private let habitsFeature: HabitsFeature
    private var recordTask: Task<Void, Never>?
    var errorMessage: String?

    init(habitsFeature: HabitsFeature = AppModel.shared.habitsFeature) {
        self.habitsFeature = habitsFeature
    }

    var habits: [Habit] { habitsFeature.habits }
    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: String? { habitsFeature.loadError }
    func retryLoading() async { await habitsFeature.reload() }
    var completedCount: Int { habits.filter(\.isCompleteToday).count }
    var todayHeading: String { Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()) }
    var isRecording: Bool { recordTask != nil }

    func toggle(_ habit: Habit) {
        startRecording(habitID: habit.id, value: habit.isCompleteToday ? 0 : (habit.dailyTarget ?? 1))
    }

    func record(_ habit: Habit, value: Int) {
        startRecording(habitID: habit.id, value: value)
    }

    private func startRecording(habitID: UUID, value: Int) {
        guard recordTask == nil else { return }
        let habitsFeature = self.habitsFeature
        recordTask = Task {
            defer { recordTask = nil }
            do {
                try await habitsFeature.recordToday(habitID: habitID, value: value)
                errorMessage = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
