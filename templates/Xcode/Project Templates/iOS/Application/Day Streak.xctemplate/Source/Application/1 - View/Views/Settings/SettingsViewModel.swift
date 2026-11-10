import Observation

@MainActor @Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var preferredDifficulty: Difficulty { settingsFeature.preferredDifficulty }
    var selectedTheme: ThemeChoice { settingsFeature.selectedTheme }
    var versionDescription: String {
        "Version \(settingsFeature.appVersion) (\(settingsFeature.buildNumber))"
    }
    func selectDifficulty(_ difficulty: Difficulty) { settingsFeature.selectDifficulty(difficulty) }
    func selectTheme(_ theme: ThemeChoice) { settingsFeature.selectTheme(theme) }
    func difficultyTitle(_ difficulty: Difficulty) -> String { difficulty.rawValue.capitalized }
    func themeTitle(_ theme: ThemeChoice) -> String { theme.rawValue.capitalized }
}
