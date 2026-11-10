import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct ThemeManagerTests {
    @Test func reflectsTheSettingsFeatureTheme() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let feature = SettingsFeature(defaults: defaults)
        let manager = ThemeManager(settingsFeature: feature)
        #expect(manager.selectedTheme == .automatic)
        feature.selectTheme(.plum)
        #expect(manager.selectedTheme == .plum)
        #expect(manager.current.colorScheme == .dark)
    }
}
