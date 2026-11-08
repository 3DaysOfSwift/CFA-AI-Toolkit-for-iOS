import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let gitReposFeature: GitReposFeature
    let settingsFeature: SettingsFeature
    private var hasFinishedLaunching: Bool

    init(gitReposFeature: GitReposFeature, settingsFeature: SettingsFeature) {
        self.gitReposFeature = gitReposFeature
        self.settingsFeature = settingsFeature
        hasFinishedLaunching = false
    }

    func applicationDidFinishLaunching() {
        guard !hasFinishedLaunching else { return }
        hasFinishedLaunching = true

        gitReposFeature.startLoading()
    }

    static func live() -> AppModel {
        let networkingManager = NetworkingManager()
        return AppModel(
            gitReposFeature: GitReposFeature(
                provider: GitHubAPI(networkingManager: networkingManager),
                cache: RepoFileCache(cacheDirectoryURL: .cachesDirectory)
            ),
            settingsFeature: SettingsFeature()
        )
    }
}
