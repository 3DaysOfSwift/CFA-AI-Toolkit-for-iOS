import Foundation

struct GitHubRepoResponse: Sendable {
    let id: Int
    let fullName: String
    let repositoryURL: URL
    let description: String?
    let stars: Int
    let updatedAt: Date
}

actor ControlledProvider: GitReposProvider {
    private(set) var calls = 0
    private var started: CheckedContinuation<Void, Never>?
    private var release: CheckedContinuation<Void, Never>?
    func waitForFirst() async { if calls > 0 { return }; await withCheckedContinuation { started = $0 } }
    func releaseFirst() { release?.resume(); release = nil }
    func fetchRepos() async throws -> [GitHubRepoResponse] {
        calls += 1
        let current = calls
        if current == 1 {
            started?.resume(); started = nil
            await withCheckedContinuation { release = $0 }
        }
        return [GitHubRepoResponse(id: current, fullName: "repo-\(current)", repositoryURL: URL(string: "https://example.org")!, description: nil, stars: 0, updatedAt: .now)]
    }
}

actor ControlledCache: RepoCache {
    private var restore: CheckedContinuation<[Repo], Error>?
    private var restoreStarted = false
    private var restoreWaiter: CheckedContinuation<Void, Never>?
    private var firstWrite: CheckedContinuation<Void, Never>?
    private var firstWriteStarted = false
    private var writeWaiter: CheckedContinuation<Void, Never>?
    private var finishWaiter: CheckedContinuation<Void, Never>?
    private(set) var storedIDs: [Int] = []
    func loadRepos() async throws -> [Repo] {
        restoreStarted = true; restoreWaiter?.resume(); restoreWaiter = nil
        return try await withCheckedThrowingContinuation { restore = $0 }
    }
    func waitForRestore() async { if restoreStarted { return }; await withCheckedContinuation { restoreWaiter = $0 } }
    func releaseRestore() { restore?.resume(returning: [Repo(id: 99, fullName: "old", repositoryURL: URL(string: "https://example.org")!, summary: "", stars: 0, updatedAt: .now)]); restore = nil }
    func saveRepos(_ repos: [Repo]) async throws {
        if !firstWriteStarted {
            firstWriteStarted = true; writeWaiter?.resume(); writeWaiter = nil
            await withCheckedContinuation { firstWrite = $0 }
        }
        storedIDs.append(repos[0].id)
        if storedIDs.count == 2 { finishWaiter?.resume(); finishWaiter = nil }
    }
    func waitForFirstWrite() async { if firstWriteStarted { return }; await withCheckedContinuation { writeWaiter = $0 } }
    func releaseFirstWrite() { firstWrite?.resume(); firstWrite = nil }
    func waitForWrites() async { if storedIDs.count == 2 { return }; await withCheckedContinuation { finishWaiter = $0 } }
}

actor FailingCache: RepoCache {
    private var failures = 0
    private var waiter: CheckedContinuation<Void, Never>?
    func loadRepos() -> [Repo] { [] }
    func saveRepos(_ repos: [Repo]) throws {
        failures += 1
        if failures == 2 { waiter?.resume(); waiter = nil }
        throw CocoaError(.fileWriteNoPermission)
    }
    func waitForRetries() async {
        if failures >= 2 { return }
        await withCheckedContinuation { waiter = $0 }
    }
}

actor ImmediateProvider: GitReposProvider {
    func fetchRepos() -> [GitHubRepoResponse] {
        [GitHubRepoResponse(id: 7, fullName: "fresh", repositoryURL: URL(string: "https://example.org")!, description: nil, stars: 0, updatedAt: .now)]
    }
}

@main struct Runner {
    @MainActor static func main() async {
        let provider = ControlledProvider()
        let cache = ControlledCache()
        let feature = GitReposFeature(provider: provider, cache: cache)
        feature.startLoading()
        await provider.waitForFirst()
        await cache.waitForRestore()
        var joined = false
        let caller = Task { @MainActor in joined = true; await feature.refresh() }
        while !joined { await Task.yield() }
        let callCount = await provider.calls
        precondition(callCount == 1)
        caller.cancel() // A departing screen does not cancel Feature-owned work.
        await provider.releaseFirst()
        await caller.value
        precondition(feature.repos.map(\.id) == [1] && !feature.isRefreshing)
        await cache.waitForFirstWrite()
        await cache.releaseRestore()
        await feature.refresh()
        precondition(feature.repos.map(\.id) == [2])
        await cache.releaseFirstWrite()
        await cache.waitForWrites()
        let storedIDs = await cache.storedIDs
        precondition(storedIDs == [1, 2])
        precondition(feature.repos.map(\.id) == [2])
        let failingCache = FailingCache()
        let otherFeature = GitReposFeature(provider: ImmediateProvider(), cache: failingCache)
        await otherFeature.refresh()
        await failingCache.waitForRetries()
        precondition(otherFeature.repos.map(\.id) == [7] && otherFeature.refreshError == nil)
        print("Passed: independent restore, shared refresh, fresh data and ordered cache writes")
    }
}
