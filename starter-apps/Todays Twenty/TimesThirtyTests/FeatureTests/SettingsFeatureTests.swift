import Foundation
import Testing
@testable import TimesThirty

@MainActor
struct SettingsFeatureTests {
    @Test func preferencesPersist() throws {
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        #expect(feature.selectedTheme == .automatic)
        feature.selectDifficulty(.challenge)
        feature.selectTheme(.ocean)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .ocean)
        defaults.set("obsolete", forKey: "preferredDifficulty")
        defaults.set("obsolete-theme", forKey: "selectedTheme")
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .everyday)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .automatic)
    }
}
