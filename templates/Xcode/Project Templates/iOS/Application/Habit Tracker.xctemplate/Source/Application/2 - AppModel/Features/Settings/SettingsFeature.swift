import Foundation
import Observation

@MainActor
@Observable
final class SettingsFeature {
    private let defaults: UserDefaults
    private(set) var firstWeekday: Int

    init(defaults: UserDefaults) {
        self.defaults = defaults
        let savedValue = defaults.integer(forKey: "firstWeekday")
        firstWeekday = [1, 2].contains(savedValue) ? savedValue : 2
    }

    func selectFirstWeekday(_ weekday: Int) {
        guard [1, 2].contains(weekday) else { return }
        firstWeekday = weekday
        defaults.set(weekday, forKey: "firstWeekday")
    }
}
