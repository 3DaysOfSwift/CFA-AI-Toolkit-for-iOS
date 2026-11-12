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
    var loadError: String? {
        habitsFeature.loadError.map { _ in "Your saved habits could not be loaded. Please try again." }
    }
    @ObservationIgnored private var retryTask: Task<Void, Never>?
    @discardableResult
    func retryLoading() -> Task<Void, Never> {
        if let retryTask { return retryTask }
        let task = Task { [weak self, habitsFeature] in
            defer { self?.retryTask = nil }
            await habitsFeature.reload()
        }
        retryTask = task
        return task
    }
    var habitCountSummary: String {
        habits.count == 1 ? "1 daily habit" : "\(habits.count) daily habits"
    }

    func description(for habit: Habit) -> String {
        if habit.tracking == .count {
            let target = habit.dailyTarget.map { " · target \($0)" } ?? ""
            return "Count\(habit.unit.isEmpty ? "" : " in \(habit.unit)")\(target)"
        }
        return habit.dailyTarget.map { "Daily target: \($0)" } ?? "Daily completion"
    }
}
