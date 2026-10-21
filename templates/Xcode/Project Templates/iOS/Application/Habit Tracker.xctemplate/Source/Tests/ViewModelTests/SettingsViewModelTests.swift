import Foundation
import Testing

@testable import ___PACKAGENAMEASIDENTIFIER___

@Suite("Settings screen")
@MainActor
struct SettingsViewModelTests {
    @Test("About displays the bundle identity, marketing version and build")
    func formatsAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults, appInformation: [
            "CFBundleDisplayName": "My Habits",
            "CFBundleName": "InternalName",
            "CFBundleShortVersionString": "2.3",
            "CFBundleVersion": "42"
        ])
        let viewModel = SettingsViewModel(settingsFeature: feature)

        #expect(viewModel.appName == "My Habits")
        #expect(viewModel.versionDescription == "Version 2.3 (42)")
    }

    @Test("Missing bundle metadata does not fabricate a release number")
    func handlesMissingAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults, appInformation: [:])
        let viewModel = SettingsViewModel(settingsFeature: feature)

        #expect(viewModel.appName == "App")
        #expect(viewModel.versionDescription == "Version — (—)")
    }

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
