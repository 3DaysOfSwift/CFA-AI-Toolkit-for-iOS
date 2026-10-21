import Foundation
import Observation

@MainActor @Observable
final class DayStreakViewModel {
    private let dayStreakFeature: DayStreakFeature
    private(set) var errorMessage: String?
    @ObservationIgnored private var refreshTask: Task<Void, Never>?

    init(dayStreakFeature: DayStreakFeature = AppModel.shared.dayStreakFeature) {
        self.dayStreakFeature = dayStreakFeature
    }

    var currentStreak: Int { dayStreakFeature.currentStreak }
    var longestStreak: Int { dayStreakFeature.longestStreak }
    var completedDayCount: Int { dayStreakFeature.completedDayCount }
    var correctAnswerCount: Int { dayStreakFeature.correctAnswerCount }
    var week: [StreakDay] { dayStreakFeature.week }
    var completedDates: [Date] { dayStreakFeature.completedDays.sorted(by: >) }

    @discardableResult
    func refresh() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        let task = Task { @MainActor in
            defer { refreshTask = nil }
            errorMessage = nil
            do { try await dayStreakFeature.refresh() }
            catch { errorMessage = error.localizedDescription }
        }
        refreshTask = task
        return task
    }
}
