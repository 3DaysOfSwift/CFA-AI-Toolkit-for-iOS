import Observation

@MainActor
@Observable
final class ThemeManager {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var selectedTheme: AppColourTheme {
        settingsFeature.selectedTheme
    }
}
