import Observation

@MainActor
@Observable
final class GitReposFeature {
    private let provider: any GitReposProvider
    private let cache: any RepoCache

    private(set) var repos: [Repo] = []
    private(set) var isRefreshing = false
    private(set) var refreshError: (any Error)?

    init(provider: any GitReposProvider, cache: any RepoCache) {
        self.provider = provider
        self.cache = cache
    }

    func refresh() async {
        guard !isRefreshing else { return }

        isRefreshing = true
        refreshError = nil
        defer { isRefreshing = false }

        if repos.isEmpty {
            await loadSavedRepos()
        }

        do {
            let responses = try await provider.fetchRepos()
            let downloadedRepos = responses.map(Repo.init(response:))
            try await cache.saveRepos(downloadedRepos)
            repos = try await cache.loadRepos()
            refreshError = nil
        } catch is CancellationError {
            return
        } catch {
            refreshError = error
        }
    }

    private func loadSavedRepos() async {
        do {
            repos = try await cache.loadRepos()
        } catch {
            refreshError = error
        }
    }
}
