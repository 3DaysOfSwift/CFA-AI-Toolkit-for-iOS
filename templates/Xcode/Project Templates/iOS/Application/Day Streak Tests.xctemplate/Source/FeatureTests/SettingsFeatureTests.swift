import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct SettingsFeatureTests {
    @Test func preferencesPersist() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        #expect(feature.preferredDifficulty == .everyday)
        #expect(feature.selectedTheme == .automatic)
        feature.selectDifficulty(.challenge)
        feature.selectTheme(.ocean)
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .challenge)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .ocean)
        #expect(!feature.appVersion.isEmpty)
        #expect(!feature.buildNumber.isEmpty)
        defaults.set("obsolete", forKey: "preferredDifficulty")
        defaults.set("obsolete-theme", forKey: "selectedTheme")
        #expect(SettingsFeature(defaults: defaults).preferredDifficulty == .everyday)
        #expect(SettingsFeature(defaults: defaults).selectedTheme == .automatic)
        let missing = SettingsFeature(defaults: defaults, appInformation: [:])
        #expect(missing.appVersion == "—")
        #expect(missing.buildNumber == "—")
        let blank = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": " ", "CFBundleVersion": ""])
        #expect(blank.appVersion == "—")
        #expect(blank.buildNumber == "—")
        let known = SettingsFeature(defaults: defaults, appInformation: ["CFBundleShortVersionString": "2.3", "CFBundleVersion": "4"])
        #expect(known.appVersion == "2.3")
        #expect(known.buildNumber == "4")
    }
}
