import Foundation
import Testing
@testable import TimesThirty

@MainActor
struct SettingsViewModelTests {
    @Test func forwardsPreferenceToItsFeature() throws {
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        let model = SettingsViewModel(settingsFeature: feature)
        model.selectDifficulty(.gentle)
        model.selectTheme(.ember)
        #expect(model.preferredDifficulty == .gentle)
        #expect(model.selectedTheme == .ember)
        #expect(feature.preferredDifficulty == .gentle)
        #expect(feature.selectedTheme == .ember)
        #expect(model.difficultyTitle(.challenge) == "Challenge")
        #expect(model.themeTitle(.midnight) == "Midnight")
        let versionModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: ["CFBundleShortVersionString": "2.3", "CFBundleVersion": "4"]
        )
        #expect(versionModel.versionDescription == "Version 2.3 (4)")
        #expect(SettingsViewModel(settingsFeature: feature, appInformation: [:]).versionDescription == "Version — (—)")
        let blankVersionModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: ["CFBundleShortVersionString": " ", "CFBundleVersion": 4]
        )
        #expect(blankVersionModel.versionDescription == "Version — (—)")
    }
}
