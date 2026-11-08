import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Application composition", .timeLimit(.minutes(1))) @MainActor
struct AppModelTests {
    @Test func initializerUsesIsolatedFeatures() throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let repos = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let settings = SettingsFeature(defaults: defaults, appInformation: [:])
        let model = AppModel(gitReposFeature: repos, settingsFeature: settings)
        #expect(model.gitReposFeature === repos)
        #expect(model.settingsFeature === settings)
    }

    @Test func repeatedLaunchStartsOneSharedRefresh() async throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let provider = LaunchProvider()
        let repos = GitReposFeature(provider: provider, cache: TestRepoCache())
        let model = AppModel(gitReposFeature: repos,
                             settingsFeature: SettingsFeature(defaults: defaults, appInformation: [:]))
        model.applicationDidFinishLaunching()
        await provider.waitUntilStarted()
        model.applicationDidFinishLaunching()
        #expect(await provider.callCount == 1)
        var joining = false
        let waiter = Task { @MainActor in
            joining = true
            await repos.refresh()
        }
        while !joining { await Task.yield() }
        await provider.release()
        await waiter.value
        model.applicationDidFinishLaunching()
        #expect(!repos.isRefreshing)
        #expect(await provider.callCount == 1)
    }

}


private actor LaunchProvider: GitReposProvider {
    private(set) var callCount = 0
    private var started: CheckedContinuation<Void, Never>?
    private var gate: CheckedContinuation<Void, Never>?

    func fetchRepos() async throws -> [GitHubRepoResponse] {
        callCount += 1
        started?.resume(); started = nil
        await withCheckedContinuation { gate = $0 }
        return []
    }
    func waitUntilStarted() async {
        if callCount > 0 { return }
        await withCheckedContinuation { started = $0 }
    }
    func release() { gate?.resume(); gate = nil }
}
