import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Settings screen") @MainActor
struct SettingsViewModelTests {
    @Test func selectionReachesFeature() throws {
        let name = "CFASettingsScreenTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let settingsFeature = SettingsFeature(defaults: defaults)
        let appInformation = AppInformation(
            appName: "CFA Example",
            marketingVersion: "2.3",
            buildNumber: "4"
        )
        let viewModel = SettingsViewModel(
            settingsFeature: settingsFeature,
            appInformation: appInformation
        )
        viewModel.selectTheme(.forest)
        #expect(settingsFeature.selectedTheme == .forest)
        #expect(viewModel.themeName(.systemGrey) == "System Grey")
        #expect(viewModel.appName == "CFA Example")
        #expect(viewModel.versionDescription == "Version 2.3 (4)")
        #expect(viewModel.developerWebsiteURL?.host() == "3daysofswiftconcurrency.com")
        let missingMetadataViewModel = SettingsViewModel(
            settingsFeature: settingsFeature,
            appInformation: AppInformation()
        )
        #expect(missingMetadataViewModel.appName == "App")
        #expect(missingMetadataViewModel.versionDescription == "Version — (—)")
    }
}
