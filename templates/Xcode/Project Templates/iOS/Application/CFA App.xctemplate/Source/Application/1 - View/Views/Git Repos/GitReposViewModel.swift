import Foundation
import Observation

@MainActor
@Observable
final class GitReposViewModel {
    private let gitReposFeature: GitReposFeature

    init(gitReposFeature: GitReposFeature = AppModel.shared.gitReposFeature) {
        self.gitReposFeature = gitReposFeature
    }

    var repos: [Repo] {
        gitReposFeature.repos
    }

    var isRefreshing: Bool {
        gitReposFeature.isRefreshing
    }

    var refreshFailureMessage: String? {
        gitReposFeature.refreshError?.localizedDescription
    }

    func refresh() async {
        await gitReposFeature.refresh()
    }
}
