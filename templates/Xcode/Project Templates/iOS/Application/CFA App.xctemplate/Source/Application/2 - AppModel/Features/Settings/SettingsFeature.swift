import Foundation
import Observation

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private let selectedColourThemeStorageKey = "selectedColourTheme"
    private let developerWebsiteAddress = "https://3daysofswiftconcurrency.com"

    private(set) var selectedTheme: AppColourTheme

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selectedTheme = AppColourTheme(rawValue: defaults.string(forKey: selectedColourThemeStorageKey) ?? "") ?? .automatic
    }

    func selectTheme(_ theme: AppColourTheme) {
        selectedTheme = theme
        defaults.set(theme.rawValue, forKey: selectedColourThemeStorageKey)
    }

    var developerWebsiteURL: URL? {
        URL(string: developerWebsiteAddress)
    }

    var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }

    var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
    }
}
