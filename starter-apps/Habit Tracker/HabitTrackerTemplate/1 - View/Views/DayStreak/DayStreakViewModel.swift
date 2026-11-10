import Foundation
import Observation

@MainActor
@Observable
final class DayStreakViewModel {
    private let dayStreakFeature: DayStreakFeature

    init(dayStreakFeature: DayStreakFeature = AppModel.shared.dayStreakFeature) {
        self.dayStreakFeature = dayStreakFeature
    }

    var summaries: [HabitStreakSummary] { dayStreakFeature.summaries }
    var isLoading: Bool { dayStreakFeature.isLoading }
    var loadError: String? {
        dayStreakFeature.loadError.map { _ in "Your saved activity could not be loaded. Please try again." }
    }
    @ObservationIgnored private var retryTask: Task<Void, Never>?
    @discardableResult
    func retryLoading() -> Task<Void, Never> {
        if let retryTask { return retryTask }
        let task = Task { [weak self, dayStreakFeature] in
            defer { self?.retryTask = nil }
            await dayStreakFeature.reload()
        }
        retryTask = task
        return task
    }

    func weekday(for day: StreakDay) -> String { day.date.formatted(.dateTime.weekday(.narrow)) }
    func accessibilityLabel(for day: StreakDay) -> String {
        "\(day.date.formatted(date: .abbreviated, time: .omitted)): \(day.isComplete ? "Completed" : "Not completed")"
    }
}
