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
    }
}
