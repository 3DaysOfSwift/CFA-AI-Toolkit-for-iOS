import Observation

@MainActor
@Observable
final class ContentViewModel {
    var selectedTab: Tab = .practice

    enum Tab: Hashable {
        case practice
        case dayStreak
        case settings
    }
}
