import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Application composition", .timeLimit(.minutes(1))) @MainActor
struct AppModelTests {
    @Test func initializerUsesIsolatedFeatures() throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let gitReposFeature = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let settingsFeature = SettingsFeature(defaults: defaults)
        let appModel = AppModel(gitReposFeature: gitReposFeature, settingsFeature: settingsFeature)
        #expect(appModel.gitReposFeature === gitReposFeature)
        #expect(appModel.settingsFeature === settingsFeature)
    }

    @Test func repeatedLaunchStartsOneSharedRefresh() async throws {
        let name = "CFACompositionTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let launchProvider = LaunchProvider()
        let gitReposFeature = GitReposFeature(provider: launchProvider, cache: TestRepoCache())
        let appModel = AppModel(gitReposFeature: gitReposFeature,
                                settingsFeature: SettingsFeature(defaults: defaults))
        appModel.applicationDidFinishLaunching()
        await launchProvider.waitUntilStarted()
        appModel.applicationDidFinishLaunching()
        #expect(await launchProvider.callCount == 1)
        var hasJoinedRefresh = false
        let refreshWaiter = Task { @MainActor in
            hasJoinedRefresh = true
            await gitReposFeature.refresh()
        }
        while !hasJoinedRefresh { await Task.yield() }
        await launchProvider.release()
        await refreshWaiter.value
        appModel.applicationDidFinishLaunching()
        #expect(!gitReposFeature.isRefreshing)
        #expect(await launchProvider.callCount == 1)
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
