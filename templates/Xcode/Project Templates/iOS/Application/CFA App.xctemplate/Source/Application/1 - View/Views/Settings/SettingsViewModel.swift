import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    func selectTheme(_ theme: AppColourTheme) {
        settingsFeature.selectTheme(theme)
    }

    var appName: String { settingsFeature.appName }

    var developerWebsiteURL: URL? {
        settingsFeature.developerWebsiteURL
    }

    var versionDescription: String {
        "Version \(settingsFeature.appVersion) (\(settingsFeature.buildNumber))"
    }
}
