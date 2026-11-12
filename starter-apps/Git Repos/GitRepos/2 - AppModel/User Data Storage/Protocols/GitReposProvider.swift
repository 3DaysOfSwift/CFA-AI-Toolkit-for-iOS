import Foundation

/// The small provider boundary lets GitReposFeature be tested without making a real GitHub request.
protocol GitReposProvider: Sendable {
    func fetchRepos() async throws -> [GitHubRepoResponse]
}

/// The local cache returns only feature domain values.
protocol RepoCache: Sendable {
    func loadRepos() async throws -> [Repo]
    func saveRepos(_ repos: [Repo]) async throws
}
