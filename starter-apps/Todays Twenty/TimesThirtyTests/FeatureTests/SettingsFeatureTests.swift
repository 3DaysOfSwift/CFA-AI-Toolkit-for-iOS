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
        #expect(feature.version.hasPrefix("Version "))
        defaults.set("obsolete", forKey: "preferredDifficulty")
        defaults.set("obsolete-theme", forKey: "selectedTheme")
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .everyday)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .automatic)
        let missing = SettingsFeature(defaults: defaults, appInformation: [:])
        #expect(missing.version == "Version — (—)")
        let blank = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": " ", "CFBundleVersion": ""])
        #expect(blank.version == "Version — (—)")
        let known = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": "2.3", "CFBundleVersion": "4"])
        #expect(known.version == "Version 2.3 (4)")
    }
}
