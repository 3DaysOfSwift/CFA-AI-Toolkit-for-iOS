import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct ThemeManagerTests {
    @Test func unknownSavedThemeFallsBackToAutomatic() throws {
        let name = "___PROJECTNAME:identifier___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        defaults.set("obsolete-theme", forKey: "selectedTheme")

        let manager = ThemeManager(defaults: defaults)
        #expect(manager.selectedTheme == .automatic)
    }
}
