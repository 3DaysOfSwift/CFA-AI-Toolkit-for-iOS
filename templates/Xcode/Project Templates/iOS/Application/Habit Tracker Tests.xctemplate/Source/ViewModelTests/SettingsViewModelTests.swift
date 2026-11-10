import Foundation
import Testing

@testable import ___PROJECTNAME:identifier___

@Suite("Settings screen")
@MainActor
struct SettingsViewModelTests {
    @Test("About displays the bundle identity, marketing version and build")
    func formatsAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature, appInformation: [
            "CFBundleDisplayName": "My Habits",
            "CFBundleName": "InternalName",
            "CFBundleShortVersionString": "2.3",
            "CFBundleVersion": "42"
        ])

        #expect(viewModel.appName == "My Habits")
        #expect(viewModel.versionDescription == "Version 2.3 (42)")
    }

    @Test("Missing bundle metadata does not fabricate a release number")
    func handlesMissingAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature, appInformation: [
            "CFBundleDisplayName": " ",
            "CFBundleName": "Habit Tracker",
            "CFBundleShortVersionString": "",
            "CFBundleVersion": 42
        ])

        #expect(viewModel.appName == "Habit Tracker")
        #expect(viewModel.versionDescription == "Version — (—)")
        #expect(SettingsViewModel(settingsFeature: feature, appInformation: [:]).appName == "App")
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

    @Test("Changing theme routes through the preference feature")
    func selectsTheme() {
        let suite = "SettingsViewModelTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            Issue.record("Could not create isolated UserDefaults suite")
            return
        }
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature)

        viewModel.selectTheme(.terracotta)

        #expect(viewModel.selectedTheme == .terracotta)
        #expect(feature.selectedTheme == .terracotta)
        #expect(viewModel.themeTitle(.terracotta) == "Terracotta")
    }
}
