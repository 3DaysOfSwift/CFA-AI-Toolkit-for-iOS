import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct SettingsViewModelTests {
    @Test func forwardsPreferenceToItsFeature() throws {
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        let model = SettingsViewModel(settingsFeature: feature)
        model.selectDifficulty(.gentle)
        #expect(model.preferredDifficulty == .gentle)
        #expect(feature.preferredDifficulty == .gentle)
    }
}
