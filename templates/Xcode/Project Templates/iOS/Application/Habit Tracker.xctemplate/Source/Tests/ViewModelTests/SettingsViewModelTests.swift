import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

@Suite("Settings screen")
@MainActor
struct SettingsViewModelTests {
    @Test("Changing week start updates the preference feature")
    func selectsWeekStart() {
        let suite = "SettingsViewModelTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            Issue.record("Could not create isolated UserDefaults suite")
            return
        }
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature)

        viewModel.selectFirstWeekday(1)

        #expect(viewModel.firstWeekday == 1)
    }
}
