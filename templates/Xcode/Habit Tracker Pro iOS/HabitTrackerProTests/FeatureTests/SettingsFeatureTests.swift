import Foundation
import Testing

@testable import HabitTrackerPro

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
}
