import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct SettingsViewModelTests {
    @Test func forwardsPreferenceToItsFeature() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature)
        viewModel.selectDifficulty(.gentle)
        viewModel.selectTheme(.ember)
        #expect(viewModel.preferredDifficulty == .gentle)
        #expect(viewModel.selectedTheme == .ember)
        #expect(feature.preferredDifficulty == .gentle)
        #expect(feature.selectedTheme == .ember)
        #expect(viewModel.difficultyTitle(.challenge) == "Challenge")
        #expect(viewModel.themeTitle(.midnight) == "Midnight")
        let versionModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: [
                "CFBundleDisplayName": "My Practice",
                "CFBundleShortVersionString": "2.3",
                "CFBundleVersion": "4"
            ]
        )
        #expect(versionModel.appName == "My Practice")
        #expect(versionModel.versionDescription == "Version 2.3 (4)")
        #expect(SettingsViewModel(settingsFeature: feature, appInformation: [:]).versionDescription == "Version — (—)")
        let blankVersionModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: ["CFBundleShortVersionString": " ", "CFBundleVersion": 4]
        )
        #expect(blankVersionModel.versionDescription == "Version — (—)")
    }
}
