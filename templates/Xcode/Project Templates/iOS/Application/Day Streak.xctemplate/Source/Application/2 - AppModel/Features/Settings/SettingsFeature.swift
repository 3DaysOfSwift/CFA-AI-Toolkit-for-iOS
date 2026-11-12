import Foundation
import Observation

enum ThemeChoice: String, CaseIterable, Identifiable {
    case automatic, daylight, midnight, quiet, ocean, plum, ember, indigo
    var id: String { rawValue }
}

@MainActor @Observable
final class SettingsFeature {
    private static let preferredDifficultyStorageKey = "preferredDifficulty"
    private static let selectedThemeStorageKey = "selectedTheme"
    private(set) var selectedTheme: ThemeChoice
    private(set) var preferredDifficulty: Difficulty
    private let defaults: UserDefaults

    init(defaults: UserDefaults) {
        self.defaults = defaults
        selectedTheme = ThemeChoice(rawValue: defaults.string(forKey: Self.selectedThemeStorageKey) ?? "") ?? .automatic
        preferredDifficulty = Difficulty(rawValue: defaults.string(forKey: Self.preferredDifficultyStorageKey) ?? "") ?? .everyday
    }

    func selectDifficulty(_ difficulty: Difficulty) {
        defaults.set(difficulty.rawValue, forKey: Self.preferredDifficultyStorageKey)
        preferredDifficulty = difficulty
    }

    func selectTheme(_ theme: ThemeChoice) {
        defaults.set(theme.rawValue, forKey: Self.selectedThemeStorageKey)
        selectedTheme = theme
    }
}
