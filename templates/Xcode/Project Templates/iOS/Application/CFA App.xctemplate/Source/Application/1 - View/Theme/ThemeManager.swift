import Observation

@MainActor
@Observable
final class ThemeManager {
    static let shared = ThemeManager(settingsFeature: AppModel.shared.settingsFeature)

    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var selectedTheme: AppColourTheme {
        settingsFeature.selectedTheme
    }
}
