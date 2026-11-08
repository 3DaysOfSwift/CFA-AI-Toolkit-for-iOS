import Foundation
import Observation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Git repositories", .timeLimit(.minutes(1))) @MainActor
struct GitReposFeatureTests {
    @Test func fileCacheRoundTripsAndRejectsCorruptData() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString, directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = RepoFileCache(cacheDirectoryURL: directory)
        #expect(try await cache.loadRepos().isEmpty)
        let url = try #require(URL(string: "https://example.org/repo"))
        let repo = Repo(id: 42, fullName: "Example/Repo", repositoryURL: url,
                        summary: "Example", stars: 3, updatedAt: Date(timeIntervalSince1970: 0))
        try await cache.saveRepos([repo])
        #expect(try await cache.loadRepos() == [repo])
        try Data("invalid JSON".utf8).write(to: directory.appending(path: "git-repositories.json"), options: .atomic)
        do {
            _ = try await cache.loadRepos()
            Issue.record("Corrupt cache data should not decode successfully")
        } catch {
            // An optional cache failure can be ignored by the Feature.
        }
    }

    @Test func refreshPublishesProviderResults() async throws {
        let url = try #require(URL(string: "https://example.org/repo"))
        let response = GitHubRepoResponse(id: 42, fullName: "Example/Repo", repositoryURL: url,
                                          description: nil, stars: 3, updatedAt: .now)
        let feature = GitReposFeature(provider: TestGitReposProvider(result: [response]), cache: TestRepoCache())
        await feature.refresh()
        #expect(feature.repos.map(\.id) == [42])
        #expect(feature.repos.first?.summary == nil)
        #expect(feature.refreshError == nil)
        #expect(!feature.isRefreshing)
    }

    @Test func refreshFailureIsExposedAndLoadingFinishes() async {
        let feature = GitReposFeature(provider: FailingGitReposProvider(), cache: TestRepoCache())
        await feature.refresh()
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
    }

    @Test func failedRefreshStillRestoresAvailableCache() async throws {
        let url = try #require(URL(string: "https://example.org/repo"))
        let cached = Repo(id: 42, fullName: "Example/Repo", repositoryURL: url,
                          summary: "Saved snapshot", stars: 3, updatedAt: .now)
        let cache = TestRepoCache()
        await cache.saveRepos([cached])
        let feature = GitReposFeature(provider: FailingGitReposProvider(), cache: cache)
        let changes = AsyncStream<Void>.makeStream()
        withObservationTracking {
            _ = feature.repos
        } onChange: {
            changes.continuation.yield(())
        }
        await feature.refresh()
        var iterator = changes.stream.makeAsyncIterator()
        _ = await iterator.next()
        #expect(feature.repos == [cached])
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
        changes.continuation.finish()
    }

    @Test func failedRefreshKeepsPreviouslyLoadedResults() async throws {
        let url = try #require(URL(string: "https://example.org/repo"))
        let response = GitHubRepoResponse(id: 42, fullName: "Example/Repo", repositoryURL: url,
                                          description: nil, stars: 3, updatedAt: .now)
        let provider = ChangingGitReposProvider(repos: [response])
        let feature = GitReposFeature(provider: provider, cache: TestRepoCache())
        await feature.refresh()
        await provider.failNextRequests()
        await feature.refresh()
        #expect(feature.repos.map(\.id) == [42])
        #expect(feature.refreshError != nil)
        #expect(!feature.isRefreshing)
    }

    @Test func cacheWriteFailureDoesNotFailARefresh() async throws {
        let url = try #require(URL(string: "https://example.org/repo"))
        let response = GitHubRepoResponse(id: 42, fullName: "Example/Repo", repositoryURL: url,
                                          description: nil, stars: 3, updatedAt: .now)
        let cache = FailingRepoCache()
        let feature = GitReposFeature(provider: TestGitReposProvider(result: [response]), cache: cache)
        await feature.refresh()
        await cache.waitForAttempts()
        #expect(await cache.attempts == 2)
        #expect(feature.repos.map(\.id) == [42])
        #expect(feature.refreshError == nil)
        #expect(!feature.isRefreshing)
    }

    @Test func sharedRefreshAndOptionalCacheStayIndependent() async throws {
        let provider = GatedReposProvider()
        let cache = GatedRepoCache()
        let feature = GitReposFeature(provider: provider, cache: cache)
        feature.startLoading()
        await provider.waitForFirstRequest()
        await cache.waitForRestore()

        var entered = false
        let caller = Task { @MainActor in
            entered = true
            await feature.refresh()
        }
        while !entered { await Task.yield() }
        var secondEntered = false
        let secondCaller = Task { @MainActor in
            secondEntered = true
            await feature.refresh()
        }
        while !secondEntered { await Task.yield() }
        #expect(await provider.calls == 1)
        caller.cancel() // One screen leaving does not cancel another screen's shared request.
        await provider.releaseFirstRequest()
        await caller.value
        await secondCaller.value
        #expect(feature.repos.map(\.id) == [1])
        #expect(!feature.isRefreshing)

        await cache.waitForFirstWrite()
        await cache.releaseRestore() // Old cached data arrives after the response.
        await feature.refresh()
        #expect(feature.repos.map(\.id) == [2])
        await cache.releaseFirstWrite()
        await cache.waitForWrites()
        #expect(await cache.storedIDs == [1, 2])
        #expect(feature.repos.map(\.id) == [2])
    }

}

// Controlled suspension makes request sharing and cache ordering observable.
private actor GatedReposProvider: GitReposProvider {
    private(set) var calls = 0
    private var started: CheckedContinuation<Void, Never>?
    private var release: CheckedContinuation<Void, Never>?

    func waitForFirstRequest() async {
        if calls > 0 { return }
        await withCheckedContinuation { started = $0 }
    }
    func releaseFirstRequest() { release?.resume(); release = nil }
    func fetchRepos() async throws -> [GitHubRepoResponse] {
        calls += 1
        let id = calls
        if id == 1 {
            started?.resume(); started = nil
            await withCheckedContinuation { release = $0 }
        }
        return [GitHubRepoResponse(id: id, fullName: "repo-\(id)",
            repositoryURL: URL(string: "https://example.org")!, description: nil,
            stars: 0, updatedAt: .now)]
    }
}

private actor GatedRepoCache: RepoCache {
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
    func waitForRestore() async {
        if restoreStarted { return }
        await withCheckedContinuation { restoreWaiter = $0 }
    }
    func releaseRestore() {
        let old = Repo(id: 99, fullName: "old", repositoryURL: URL(string: "https://example.org")!,
                       summary: "", stars: 0, updatedAt: .now)
        restore?.resume(returning: [old]); restore = nil
    }
    func saveRepos(_ repos: [Repo]) async throws {
        if !firstWriteStarted {
            firstWriteStarted = true; writeWaiter?.resume(); writeWaiter = nil
            await withCheckedContinuation { firstWrite = $0 }
        }
        if let repo = repos.first { storedIDs.append(repo.id) }
        if storedIDs.count == 2 { finishWaiter?.resume(); finishWaiter = nil }
    }
    func waitForFirstWrite() async {
        if firstWriteStarted { return }
        await withCheckedContinuation { writeWaiter = $0 }
    }
    func releaseFirstWrite() { firstWrite?.resume(); firstWrite = nil }
    func waitForWrites() async {
        if storedIDs.count == 2 { return }
        await withCheckedContinuation { finishWaiter = $0 }
    }
}

private actor FailingRepoCache: RepoCache {
    private(set) var attempts = 0
    private var waiter: CheckedContinuation<Void, Never>?

    func loadRepos() -> [Repo] { [] }
    func saveRepos(_ repos: [Repo]) throws {
        attempts += 1
        if attempts == 2 { waiter?.resume(); waiter = nil }
        throw CocoaError(.fileWriteNoPermission)
    }
    func waitForAttempts() async {
        if attempts >= 2 { return }
        await withCheckedContinuation { waiter = $0 }
    }
}
