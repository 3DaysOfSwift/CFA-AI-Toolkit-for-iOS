import Foundation
import Testing

@testable import ___PROJECTNAME:identifier___

@Suite("Settings feature")
@MainActor
struct SettingsFeatureTests {
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

    @Test("Theme selection is saved, restored and validated")
    func persistsThemeSelection() {
        let suite = "SettingsFeatureTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            Issue.record("Could not create isolated UserDefaults suite")
            return
        }
        defer { defaults.removePersistentDomain(forName: suite) }
        let feature = SettingsFeature(defaults: defaults)

        feature.selectTheme(.ocean)

        #expect(feature.selectedTheme == .ocean)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .ocean)
        defaults.set("obsolete-theme", forKey: "selectedTheme")
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .automatic)
        for legacyTheme in [ThemeSelection.light, .dark] {
            defaults.set(legacyTheme.rawValue, forKey: "selectedTheme")
            #expect(SettingsFeature(defaults: defaults).selectedTheme == legacyTheme)
        }
    }
}
