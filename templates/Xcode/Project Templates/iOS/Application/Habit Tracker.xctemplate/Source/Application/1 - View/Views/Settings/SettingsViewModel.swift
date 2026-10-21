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
    var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    func selectFirstWeekday(_ weekday: Int) {
        settingsFeature.selectFirstWeekday(weekday)
    }
}
