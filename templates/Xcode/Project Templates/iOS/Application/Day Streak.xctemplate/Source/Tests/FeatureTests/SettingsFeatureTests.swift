import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct SettingsFeatureTests {
    @Test func difficultyPreferencePersists() throws {
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        feature.selectDifficulty(.challenge)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        #expect(feature.version.hasPrefix("Version "))
    }
}
