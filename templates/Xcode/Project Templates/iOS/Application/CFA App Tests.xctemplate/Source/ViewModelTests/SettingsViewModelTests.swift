import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Settings screen") @MainActor
struct SettingsViewModelTests {
    @Test func selectionReachesFeature() throws {
        let name = "CFASettingsScreenTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        let model = SettingsViewModel(settingsFeature: feature, appInformation: [
            "CFBundleDisplayName": "CFA Example",
            "CFBundleShortVersionString": "2.3",
            "CFBundleVersion": "4"
        ])
        model.selectTheme(.forest)
        #expect(feature.selectedTheme == .forest)
        #expect(model.themeName(.systemGrey) == "System Grey")
        #expect(model.appName == "CFA Example")
        #expect(model.versionDescription == "Version 2.3 (4)")
        #expect(model.developerWebsiteURL?.host() == "3daysofswiftconcurrency.com")
        let missing = SettingsViewModel(settingsFeature: feature, appInformation: [:])
        #expect(missing.appName == "App")
        #expect(missing.versionDescription == "Version — (—)")
    }
}
