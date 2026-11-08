import Foundation
import Observation

@MainActor @Observable
final class SettingsFeature {
    private(set) var preferredDifficulty: Difficulty
    private let defaults: UserDefaults
    let version: String

    init(defaults: UserDefaults, appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.defaults = defaults
        preferredDifficulty = Difficulty(rawValue: defaults.string(forKey: "preferredDifficulty") ?? "") ?? .everyday
        func information(_ key: String) -> String {
            guard let value = appInformation[key] as? String,
                  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return "—" }
            return value
        }
        let number = information("CFBundleShortVersionString")
        let build = information("CFBundleVersion")
        version = "Version \(number) (\(build))"
    }

    func selectDifficulty(_ difficulty: Difficulty) {
        defaults.set(difficulty.rawValue, forKey: "preferredDifficulty")
        preferredDifficulty = difficulty
    }
}
