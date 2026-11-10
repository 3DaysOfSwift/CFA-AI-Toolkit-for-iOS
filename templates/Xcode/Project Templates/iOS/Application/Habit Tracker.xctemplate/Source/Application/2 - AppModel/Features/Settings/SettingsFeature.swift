import Foundation
import Observation

enum ThemeSelection: String, CaseIterable, Identifiable {
    case automatic, light, dark, ocean, plum, forest, terracotta, indigo
    var id: String { rawValue }
}

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private let appInformation: [String: Any]
    private(set) var firstWeekday: Int
    private(set) var selectedTheme: ThemeSelection

    init(defaults: UserDefaults, appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.defaults = defaults
        self.appInformation = appInformation
        let savedValue = defaults.integer(forKey: "firstWeekday")
        firstWeekday = [1, 2].contains(savedValue) ? savedValue : 2
        selectedTheme = ThemeSelection(rawValue: defaults.string(forKey: "selectedTheme") ?? "") ?? .automatic
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

    func selectFirstWeekday(_ weekday: Int) {
        guard [1, 2].contains(weekday) else { return }
        defaults.set(weekday, forKey: "firstWeekday")
        firstWeekday = weekday
    }

    func selectTheme(_ theme: ThemeSelection) {
        defaults.set(theme.rawValue, forKey: "selectedTheme")
        selectedTheme = theme
    }
}
