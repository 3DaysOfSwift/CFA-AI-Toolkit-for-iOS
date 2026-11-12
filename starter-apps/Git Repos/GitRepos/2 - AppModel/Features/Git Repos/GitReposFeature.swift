import Foundation
import Observation

@MainActor
@Observable
final class GitReposFeature {
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private var cacheRestoreTask: Task<Void, Never>?
    @ObservationIgnored private var cacheWriteTask: Task<Void, Never>?
    @ObservationIgnored private var cacheWriteID: UUID?
    @ObservationIgnored private var didStartCacheRestore = false
    @ObservationIgnored private var hasFreshResponse = false
    private let provider: any GitReposProvider
    private let cache: any RepoCache

    private(set) var repos: [Repo] = []
    private(set) var isRefreshing = false
    private(set) var refreshError: (any Error)?

    init(provider: any GitReposProvider, cache: any RepoCache) {
        self.provider = provider
        self.cache = cache
    }

    // Schedule refresh before cache restoration; either task may begin first.
    func startLoading() {
        _ = startRefreshIfNeeded()
        startCacheRestoreIfNeeded()
    }

    func refresh() async {
        let task = startRefreshIfNeeded()
        startCacheRestoreIfNeeded()
        await task.value
    }

    private func startRefreshIfNeeded() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        isRefreshing = true
        refreshError = nil
        let task = Task { @MainActor in
            defer { isRefreshing = false; refreshTask = nil }
            do {
                let response = try await provider.fetchRepos()
                let downloaded = response.map(Repo.init(response:))
                repos = downloaded
                hasFreshResponse = true
                refreshError = nil
                saveCacheInBackground(downloaded)
            } catch is CancellationError {
                return
            } catch {
                refreshError = error
            }
        }
        refreshTask = task
        return task
    }

    private func startCacheRestoreIfNeeded() {
        guard !didStartCacheRestore else { return }
        didStartCacheRestore = true
        cacheRestoreTask = Task { @MainActor in
            defer { cacheRestoreTask = nil }
            guard let saved = try? await cache.loadRepos(), !hasFreshResponse else { return }
            repos = saved
        }
    }

    // Preserve write order so an older snapshot cannot replace a newer one.
    private func saveCacheInBackground(_ snapshot: [Repo]) {
        let previous = cacheWriteTask
        let id = UUID()
        let task = Task { @MainActor in
            await previous?.value
            defer {
                if cacheWriteID == id { cacheWriteTask = nil; cacheWriteID = nil }
            }
            for _ in 0..<2 {
                do { try await cache.saveRepos(snapshot); return }
                catch { /* The remote response is already available. */ }
            }
        }
        cacheWriteTask = task
        cacheWriteID = id
    }
}
