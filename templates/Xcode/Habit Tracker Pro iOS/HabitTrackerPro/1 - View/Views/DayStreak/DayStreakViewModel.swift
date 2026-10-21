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
    var loadError: String? { dayStreakFeature.loadError }
    func retryLoading() async { await dayStreakFeature.reload() }

    func weekday(for day: StreakDay) -> String { day.date.formatted(.dateTime.weekday(.narrow)) }
    func accessibilityLabel(for day: StreakDay) -> String {
        "\(day.date.formatted(date: .abbreviated, time: .omitted)): \(day.isComplete ? "Completed" : "Not completed")"
    }
}
