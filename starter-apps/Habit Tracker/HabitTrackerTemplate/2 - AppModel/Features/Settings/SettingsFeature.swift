import Foundation
import Observation

enum ThemeSelection: String, CaseIterable, Identifiable {
    case automatic, light, dark, ocean, plum, forest, terracotta, indigo
    var id: String { rawValue }
}

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private(set) var firstWeekday: Int
    private(set) var selectedTheme: ThemeSelection

    init(defaults: UserDefaults) {
        self.defaults = defaults
        let savedValue = defaults.integer(forKey: "firstWeekday")
        firstWeekday = [1, 2].contains(savedValue) ? savedValue : 2
        selectedTheme = ThemeSelection(rawValue: defaults.string(forKey: "selectedTheme") ?? "") ?? .automatic
    }

    func selectFirstWeekday(_ weekday: Int) {
        guard [1, 2].contains(weekday) else { return }
        defaults.set(weekday, forKey: "firstWeekday")
        firstWeekday = weekday
    }

    func selectTheme(_ theme: ThemeSelection) {
        defaults.set(theme.rawValue, forKey: "selectedTheme")
        selectedTheme = theme
    }
}
