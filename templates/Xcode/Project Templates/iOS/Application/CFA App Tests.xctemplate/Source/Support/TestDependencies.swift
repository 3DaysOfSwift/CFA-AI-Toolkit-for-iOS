import Foundation
@testable import ___PROJECTNAME:identifier___

actor TestGitReposProvider: GitReposProvider {
    let result: [GitHubRepoResponse]
    init(result: [GitHubRepoResponse] = []) { self.result = result }
    func fetchRepos() -> [GitHubRepoResponse] { result }
}

private enum TestNetworkError: Error { case unavailable }

actor FailingGitReposProvider: GitReposProvider {
    func fetchRepos() throws -> [GitHubRepoResponse] { throw TestNetworkError.unavailable }
}

actor ChangingGitReposProvider: GitReposProvider {
    private let repos: [GitHubRepoResponse]
    private var shouldFail = false

    init(repos: [GitHubRepoResponse]) { self.repos = repos }
    func failNextRequests() { shouldFail = true }
    func fetchRepos() throws -> [GitHubRepoResponse] {
        if shouldFail { throw TestNetworkError.unavailable }
        return repos
    }
}

actor TestRepoCache: RepoCache {
    private var stored: [Repo] = []
    func loadRepos() -> [Repo] { stored }
    func saveRepos(_ repos: [Repo]) { stored = repos }
}
