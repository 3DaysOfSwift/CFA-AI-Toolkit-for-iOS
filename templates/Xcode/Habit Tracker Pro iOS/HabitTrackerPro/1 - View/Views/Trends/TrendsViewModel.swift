import Foundation
import Observation

@MainActor
@Observable
final class TrendsViewModel {
    private let trendsFeature: TrendsFeature
    var selectedHabitID: UUID?

    init(trendsFeature: TrendsFeature = AppModel.shared.trendsFeature) {
        self.trendsFeature = trendsFeature
    }

    var hasAccess: Bool { trendsFeature.hasAccess }
    var isLoading: Bool { trendsFeature.isLoading }
    var loadError: String? { trendsFeature.loadError }
    var trends: [HabitTrend] { trendsFeature.trends }
    var selectedTrend: HabitTrend? {
        trends.first(where: { $0.id == selectedHabitID }) ?? trends.first
    }
    var selectedID: UUID? {
        get { selectedTrend?.id }
        set { selectedHabitID = newValue }
    }
    func retry() async { await trendsFeature.reload() }
}
