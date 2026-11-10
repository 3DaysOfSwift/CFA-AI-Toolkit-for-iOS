import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let settingsFeature: SettingsFeature
    var selectedTheme: AppColourTheme {
        AppColourTheme.availableThemes.first(where: { $0.id == settingsFeature.selectedTheme.rawValue }) ?? .automatic
    }

    init(settingsFeature: SettingsFeature) {
        self.settingsFeature = settingsFeature
    }
}
