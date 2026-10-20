import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let gitReposFeature: GitReposFeature
    let settingsFeature: SettingsFeature
    private var hasFinishedLaunching = false

    init(gitReposFeature: GitReposFeature, settingsFeature: SettingsFeature) {
        self.gitReposFeature = gitReposFeature
        self.settingsFeature = settingsFeature
    }

    func applicationDidFinishLaunching() async {
        guard !hasFinishedLaunching else { return }
        hasFinishedLaunching = true

        await gitReposFeature.refresh()
    }

    static func live() -> AppModel {
        do {
            let cachesDirectoryURL = try FileManager.default.url(
                for: .cachesDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: true
            )

            return AppModel(
                gitReposFeature: GitReposFeature(
                    provider: GitHubAPI(),
                    cache: RepoFileCache(cacheDirectoryURL: cachesDirectoryURL)
                ),
                settingsFeature: SettingsFeature()
            )
        } catch {
            preconditionFailure("Unable to open the Git Repositories cache directory: \(error.localizedDescription)")
        }
    }
}
