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
        let viewModel = SettingsViewModel(settingsFeature: feature)
        viewModel.selectDifficulty(.gentle)
        viewModel.selectTheme(.ember)
        #expect(viewModel.preferredDifficulty == .gentle)
        #expect(viewModel.selectedTheme == .ember)
        #expect(feature.preferredDifficulty == .gentle)
        #expect(feature.selectedTheme == .ember)
        #expect(viewModel.difficultyTitle(.challenge) == "Challenge")
        #expect(viewModel.themeTitle(.midnight) == "Midnight")
        let versionViewModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: AppInformation(
                appName: "My Practice",
                marketingVersion: "2.3",
                buildNumber: "4"
            )
        )
        #expect(versionViewModel.appName == "My Practice")
        #expect(versionViewModel.versionDescription == "Version 2.3 (4)")
        let missingMetadataViewModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: AppInformation()
        )
        #expect(missingMetadataViewModel.versionDescription == "Version — (—)")
        let blankVersionViewModel = SettingsViewModel(
            settingsFeature: feature,
            appInformation: AppInformation(marketingVersion: " ", buildNumber: nil)
        )
        #expect(blankVersionViewModel.versionDescription == "Version — (—)")
    }
}
