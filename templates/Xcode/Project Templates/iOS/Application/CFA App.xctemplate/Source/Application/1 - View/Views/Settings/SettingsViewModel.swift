import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature
    private let appInformation: [String: Any]
    private let developerWebsiteAddress = "https://3daysofswiftconcurrency.com"

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature,
         appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.settingsFeature = settingsFeature
        self.appInformation = appInformation
    }

    func selectTheme(_ theme: AppColourTheme) {
        settingsFeature.selectTheme(theme)
    }

    func themeName(_ theme: AppColourTheme) -> String {
        switch theme {
        case .automatic: "Automatic"
        case .ocean: "Ocean"
        case .graphite: "Graphite"
        case .midnight: "Midnight"
        case .systemGrey: "System Grey"
        case .forest: "Forest"
        case .terracotta: "Terracotta"
        case .lavender: "Lavender"
        }
    }

    var appName: String {
        information(for: "CFBundleDisplayName") ?? information(for: "CFBundleName") ?? "App"
    }

    var developerWebsiteURL: URL? {
        URL(string: developerWebsiteAddress)
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
}
