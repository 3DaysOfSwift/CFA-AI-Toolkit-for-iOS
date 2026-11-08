import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Settings") @MainActor
struct SettingsFeatureTests {
    @Test func invalidThemeFallsBackAndSelectionPersists() throws {
        let name = "CFASettingsTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        defaults.set("obsolete", forKey: "selectedColourTheme")
        let feature = SettingsFeature(defaults: defaults, appInformation: [:])
        #expect(feature.selectedTheme == .automatic)
        feature.selectTheme(.ocean)
        #expect(defaults.string(forKey: "selectedColourTheme") == AppColourTheme.ocean.rawValue)
    }
}
