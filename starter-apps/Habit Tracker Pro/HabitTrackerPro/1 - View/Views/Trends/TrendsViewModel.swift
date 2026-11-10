import Foundation
import Observation

@MainActor
@Observable
final class TrendsViewModel {
    private let trendsFeature: TrendsFeature
    private let purchasesFeature: PurchasesFeature
    var selectedHabitID: UUID?

    init(trendsFeature: TrendsFeature = AppModel.shared.trendsFeature,
         purchasesFeature: PurchasesFeature = AppModel.shared.purchasesFeature) {
        self.trendsFeature = trendsFeature
        self.purchasesFeature = purchasesFeature
    }

    var hasAccess: Bool { purchasesFeature.hasTrendsAccess }
    var isLoading: Bool { hasAccess && trendsFeature.isLoading }
    var loadError: String? { hasAccess ? trendsFeature.loadError.map(message(for:)) : nil }
    var trends: [HabitTrend] { hasAccess ? trendsFeature.trends : [] }
    var selectedTrend: HabitTrend? {
        trends.first(where: { $0.id == selectedHabitID }) ?? trends.first
    }
    var selectedID: UUID? {
        get { selectedTrend?.id }
        set { selectedHabitID = newValue }
    }
    func activityUnit(for trend: HabitTrend) -> String {
        if trend.tracking == .completion { return "Completion" }
        return trend.unit.isEmpty ? "Recorded amount" : trend.unit
    }
    @ObservationIgnored private var retryTask: Task<Void, Never>?
    @discardableResult
    func retry() -> Task<Void, Never> {
        if let retryTask { return retryTask }
        let task = Task { [weak self, trendsFeature] in
            defer { self?.retryTask = nil }
            guard self?.hasAccess == true else { return }
            await trendsFeature.reload()
        }
        retryTask = task
        return task
    }

    private func message(for error: any Error) -> String {
        "We couldn’t load your habit trends. Please try again."
    }
}
