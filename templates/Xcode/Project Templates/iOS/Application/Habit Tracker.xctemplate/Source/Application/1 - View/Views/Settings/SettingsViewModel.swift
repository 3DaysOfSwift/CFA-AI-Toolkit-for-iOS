import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var firstWeekday: Int { settingsFeature.firstWeekday }
    var selectedTheme: ThemeSelection { settingsFeature.selectedTheme }
    var appName: String { settingsFeature.appName }

    var versionDescription: String {
        "Version \(settingsFeature.appVersion) (\(settingsFeature.buildNumber))"
    }

    func selectFirstWeekday(_ weekday: Int) {
        settingsFeature.selectFirstWeekday(weekday)
    }

    func selectTheme(_ theme: ThemeSelection) {
        settingsFeature.selectTheme(theme)
    }

    func themeTitle(_ theme: ThemeSelection) -> String {
        switch theme {
        case .automatic: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        case .ocean: "Ocean"
        case .plum: "Plum"
        case .forest: "Forest"
        case .terracotta: "Terracotta"
        case .indigo: "Indigo"
        }
    }
}
