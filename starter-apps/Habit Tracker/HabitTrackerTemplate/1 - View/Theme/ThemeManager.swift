import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let defaults: UserDefaults
    private(set) var selectedTheme: AppColourTheme

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let savedID = defaults.string(forKey: "selectedTheme")
        selectedTheme = AppColourTheme.availableThemes.first(where: { $0.id == savedID }) ?? .automatic
    }

    func select(_ theme: AppColourTheme) {
        selectedTheme = theme
        defaults.set(theme.id, forKey: "selectedTheme")
    }
}
