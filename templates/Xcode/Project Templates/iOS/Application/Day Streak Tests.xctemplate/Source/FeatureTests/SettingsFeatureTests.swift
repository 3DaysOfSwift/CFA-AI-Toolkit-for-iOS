import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct SettingsFeatureTests {
    @Test func difficultyPreferencePersists() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        feature.selectDifficulty(.challenge)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        #expect(feature.version.hasPrefix("Version "))
        defaults.set("obsolete", forKey: "preferredDifficulty")
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .everyday)
        let missing = SettingsFeature(defaults: defaults, appInformation: [:])
        #expect(missing.version == "Version — (—)")
        let blank = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": " ", "CFBundleVersion": ""])
        #expect(blank.version == "Version — (—)")
        let known = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": "2.3", "CFBundleVersion": "4"])
        #expect(known.version == "Version 2.3 (4)")
    }
}
