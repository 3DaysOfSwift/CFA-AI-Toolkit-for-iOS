import Foundation
import Testing

@testable import HabitTrackerPro

@Suite("Settings screen")
@MainActor
struct SettingsViewModelTests {
    @Test("About displays the bundle identity, marketing version and build")
    func formatsAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let appInformation = AppInformation(
            appName: "My Habits",
            marketingVersion: "2.3",
            buildNumber: "42"
        )
        let viewModel = SettingsViewModel(settingsFeature: feature, appInformation: appInformation)

        #expect(viewModel.appName == "My Habits")
        #expect(viewModel.versionDescription == "Version 2.3 (42)")
    }

    @Test("Missing bundle metadata does not fabricate a release number")
    func handlesMissingAboutInformation() throws {
        let suite = "SettingsAboutTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature, appInformation: AppInformation())

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

    @Test("Changing theme updates the preference feature")
    func selectsTheme() {
        let suite = "SettingsViewModelTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            Issue.record("Could not create isolated UserDefaults suite")
            return
        }
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)
        let viewModel = SettingsViewModel(settingsFeature: feature)

        viewModel.selectTheme(.ocean)

        #expect(viewModel.selectedTheme == .ocean)
        #expect(viewModel.themeTitle(.ocean) == "Ocean")
    }
}
