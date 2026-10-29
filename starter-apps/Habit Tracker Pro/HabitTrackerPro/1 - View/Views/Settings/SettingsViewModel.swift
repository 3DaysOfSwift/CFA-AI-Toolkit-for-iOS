import Foundation
import Observation

@MainActor
@Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.settingsFeature = settingsFeature
    }

    var firstWeekday: Int { settingsFeature.firstWeekday }
    var appName: String { settingsFeature.appName }

    var versionDescription: String {
        "Version \(settingsFeature.appVersion) (\(settingsFeature.buildNumber))"
    }

    func selectFirstWeekday(_ weekday: Int) {
        settingsFeature.selectFirstWeekday(weekday)
    }
}
