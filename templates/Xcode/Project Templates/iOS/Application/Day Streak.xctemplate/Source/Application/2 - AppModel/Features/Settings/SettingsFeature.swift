import Foundation
import Observation

enum ThemeChoice: String, CaseIterable, Identifiable {
    case automatic, daylight, midnight, quiet, ocean, plum, ember, indigo
    var id: String { rawValue }
}

@MainActor @Observable
final class SettingsFeature {
    private(set) var selectedTheme: ThemeChoice
    private(set) var preferredDifficulty: Difficulty
    private let defaults: UserDefaults
    private let appInformation: [String: Any]

    init(defaults: UserDefaults, appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.defaults = defaults
        self.appInformation = appInformation
        selectedTheme = ThemeChoice(rawValue: defaults.string(forKey: "selectedTheme") ?? "") ?? .automatic
        preferredDifficulty = Difficulty(rawValue: defaults.string(forKey: "preferredDifficulty") ?? "") ?? .everyday
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

    func selectDifficulty(_ difficulty: Difficulty) {
        defaults.set(difficulty.rawValue, forKey: "preferredDifficulty")
        preferredDifficulty = difficulty
    }

    func selectTheme(_ theme: ThemeChoice) {
        defaults.set(theme.rawValue, forKey: "selectedTheme")
        selectedTheme = theme
    }
}
