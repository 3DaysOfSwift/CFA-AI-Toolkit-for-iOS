import Observation
import SwiftUI

@MainActor
@Observable
final class ThemeManager {
    private let defaults: UserDefaults
    private(set) var current: AppColourTheme

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let savedID = defaults.string(forKey: "selectedTheme")
        current = AppColourTheme.selections.first(where: { $0.id == savedID }) ?? .automatic
    }

    func select(_ theme: AppColourTheme) {
        current = theme
        defaults.set(theme.id, forKey: "selectedTheme")
    }
}
