import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature
    private let appInformation: [String: Any]

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature,
         appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.settingsFeature = settingsFeature
        self.appInformation = appInformation
    }

    var firstWeekday: Int { settingsFeature.firstWeekday }
    var selectedTheme: ThemeSelection { settingsFeature.selectedTheme }
    var appName: String {
        information(for: "CFBundleDisplayName") ?? information(for: "CFBundleName") ?? "App"
    }

    var versionDescription: String {
        "Version \(information(for: "CFBundleShortVersionString") ?? "—") " +
        "(\(information(for: "CFBundleVersion") ?? "—"))"
    }

    private func information(for key: String) -> String? {
        guard let value = appInformation[key] as? String,
              !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return value
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
