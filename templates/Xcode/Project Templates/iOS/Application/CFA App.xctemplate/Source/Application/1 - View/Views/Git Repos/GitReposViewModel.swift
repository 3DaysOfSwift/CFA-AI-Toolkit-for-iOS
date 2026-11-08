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
        gitReposFeature.refreshError == nil ? nil : "Could not refresh GitHub repositories. Please try again."
    }

    @ObservationIgnored private var refreshTask: Task<Void, Never>?

    @discardableResult
    func refresh() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        let task = Task { [weak self, gitReposFeature] in
            defer { self?.refreshTask = nil }
            await gitReposFeature.refresh()
        }
        refreshTask = task
        return task
    }
}
