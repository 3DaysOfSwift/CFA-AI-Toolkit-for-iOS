import Foundation
import Testing

@testable import HabitTrackerTemplate

@Suite("Settings feature")
@MainActor
struct SettingsFeatureTests {
    @Test("Blank display names fall back to the bundle name and invalid versions stay unknown")
    func resolvesBundleMetadata() throws {
        let suite = "SettingsMetadataTests.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults, appInformation: [
            "CFBundleDisplayName": " ",
            "CFBundleName": "Habit Tracker",
            "CFBundleShortVersionString": "",
            "CFBundleVersion": 42
        ])

        #expect(feature.appName == "Habit Tracker")
        #expect(feature.appVersion == "—")
        #expect(feature.buildNumber == "—")
    }

    @Test("Week start is saved and restored")
    func persistsFirstWeekday() {
        let suite = "SettingsFeatureTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            Issue.record("Could not create isolated UserDefaults suite")
            return
        }
        defer { defaults.removePersistentDomain(forName: suite) }

        let feature = SettingsFeature(defaults: defaults)
        feature.selectFirstWeekday(1)

        #expect(feature.firstWeekday == 1)
        #expect(SettingsFeature(defaults: defaults).firstWeekday == 1)
    }
}
