import Foundation
import Observation

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private let selectedColourThemeStorageKey = "selectedColourTheme"

    private(set) var selectedTheme: AppColourTheme

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selectedTheme = AppColourTheme(rawValue: defaults.string(forKey: selectedColourThemeStorageKey) ?? "") ?? .automatic
    }

    func selectTheme(_ theme: AppColourTheme) {
        defaults.set(theme.rawValue, forKey: selectedColourThemeStorageKey)
        selectedTheme = theme
    }
}
