import Foundation
import Observation

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private let appInformation: [String: Any]
    private let selectedColourThemeStorageKey = "selectedColourTheme"
    private let developerWebsiteAddress = "https://3daysofswiftconcurrency.com"

    private(set) var selectedTheme: AppColourTheme

    init(defaults: UserDefaults = .standard, appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.defaults = defaults
        self.appInformation = appInformation
        selectedTheme = AppColourTheme(rawValue: defaults.string(forKey: selectedColourThemeStorageKey) ?? "") ?? .automatic
    }

    func selectTheme(_ theme: AppColourTheme) {
        selectedTheme = theme
        defaults.set(theme.rawValue, forKey: selectedColourThemeStorageKey)
    }

    var developerWebsiteURL: URL? {
        URL(string: developerWebsiteAddress)
    }

    var appName: String {
        information(for: "CFBundleDisplayName") ?? information(for: "CFBundleName") ?? "App"
    }

    var appVersion: String { information(for: "CFBundleShortVersionString") ?? "—" }
    var buildNumber: String { information(for: "CFBundleVersion") ?? "—" }

    private func information(for key: String) -> String? {
        guard let value = appInformation[key] as? String,
              !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return value
    }
}
