import Foundation
import Observation

@MainActor @Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature
    private let appInformation: AppInformation

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature,
         appInformation: AppInformation = .current) {
        self.settingsFeature = settingsFeature
        self.appInformation = appInformation
    }

    var preferredDifficulty: Difficulty { settingsFeature.preferredDifficulty }
    var selectedTheme: ThemeChoice { settingsFeature.selectedTheme }
    var appName: String { appInformation.appName }
    var versionDescription: String { appInformation.versionDescription }
    func selectDifficulty(_ difficulty: Difficulty) { settingsFeature.selectDifficulty(difficulty) }
    func selectTheme(_ theme: ThemeChoice) { settingsFeature.selectTheme(theme) }
    func difficultyTitle(_ difficulty: Difficulty) -> String { difficulty.rawValue.capitalized }
    func themeTitle(_ theme: ThemeChoice) -> String { theme.rawValue.capitalized }
}
