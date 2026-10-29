import Foundation
import Observation

@MainActor
@Observable
final class HabitsViewModel {
    private let habitsFeature: HabitsFeature
    init(habitsFeature: HabitsFeature = AppModel.shared.habitsFeature) {
        self.habitsFeature = habitsFeature
    }

    var habits: [Habit] { habitsFeature.habits }
    var isLoading: Bool { habitsFeature.isLoading }
    var loadError: String? { habitsFeature.loadError }
    func retryLoading() async { await habitsFeature.reload() }
    var habitCountSummary: String {
        habits.count == 1 ? "1 daily habit" : "\(habits.count) daily habits"
    }
}
