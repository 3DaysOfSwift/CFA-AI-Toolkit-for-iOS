import Observation

@MainActor
@Observable
final class ContentViewModel {
    var selectedTab: Tab = .today

    enum Tab: Hashable {
        case today
        case habits
        case dayStreak
        case trends
        case settings
    }
}
