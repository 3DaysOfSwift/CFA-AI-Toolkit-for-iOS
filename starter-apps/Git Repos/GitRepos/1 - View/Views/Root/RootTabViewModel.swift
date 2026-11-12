import Observation

@MainActor
@Observable
final class RootTabViewModel {
    var selectedTab: Tab = .gitRepos

    enum Tab: Hashable {
        case gitRepos
        case settings
    }
}
