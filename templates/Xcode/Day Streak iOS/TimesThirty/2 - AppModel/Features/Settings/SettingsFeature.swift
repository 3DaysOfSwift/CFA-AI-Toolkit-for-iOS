import Foundation
import Observation

@MainActor @Observable
final class SettingsFeature {
    private(set) var preferredDifficulty: Difficulty
    private let defaults: UserDefaults
    let version: String

    init(defaults: UserDefaults, bundle: Bundle = .main) {
        self.defaults = defaults
        preferredDifficulty = Difficulty(rawValue: defaults.string(forKey: "preferredDifficulty") ?? "") ?? .everyday
        let number = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        version = "Version \(number) (\(build))"
    }

    func selectDifficulty(_ difficulty: Difficulty) {
        preferredDifficulty = difficulty
        defaults.set(difficulty.rawValue, forKey: "preferredDifficulty")
    }
}
