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
        do {
            let networkingManager = NetworkingManager()
            let cachesDirectoryURL = try FileManager.default.url(
                for: .cachesDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: true
            )

            return AppModel(
                gitReposFeature: GitReposFeature(
                    provider: GitHubAPI(networkingManager: networkingManager),
                    cache: RepoFileCache(cacheDirectoryURL: cachesDirectoryURL)
                ),
                settingsFeature: SettingsFeature()
            )
        } catch {
            preconditionFailure("Unable to open the Git Repositories cache directory: \(error.localizedDescription)")
        }
    }
}
