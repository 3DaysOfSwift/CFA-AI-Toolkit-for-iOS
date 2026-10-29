import Foundation
import Testing
@testable import TimesThirty

@MainActor
struct SettingsFeatureTests {
    @Test func difficultyPreferencePersists() throws {
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        feature.selectDifficulty(.challenge)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        #expect(feature.version.hasPrefix("Version "))
    }
}
