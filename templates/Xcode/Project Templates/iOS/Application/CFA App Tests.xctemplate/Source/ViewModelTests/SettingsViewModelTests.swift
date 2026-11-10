import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Settings screen") @MainActor
struct SettingsViewModelTests {
    @Test func selectionReachesFeature() throws {
        let name = "CFASettingsScreenTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults, appInformation: [:])
        let model = SettingsViewModel(settingsFeature: feature)
        model.selectTheme(.forest)
        #expect(feature.selectedTheme == .forest)
        #expect(model.themeName(.systemGrey) == "System Grey")
    }
}
