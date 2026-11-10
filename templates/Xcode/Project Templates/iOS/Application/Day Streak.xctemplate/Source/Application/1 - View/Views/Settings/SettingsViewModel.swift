import Observation

@MainActor @Observable
final class SettingsViewModel {
    private let settingsFeature: SettingsFeature
    private let appInformation: [String: Any]

    init(settingsFeature: SettingsFeature = AppModel.shared.settingsFeature,
         appInformation: [String: Any] = Bundle.main.infoDictionary ?? [:]) {
        self.settingsFeature = settingsFeature
        self.appInformation = appInformation
    }

    var preferredDifficulty: Difficulty { settingsFeature.preferredDifficulty }
    var selectedTheme: ThemeChoice { settingsFeature.selectedTheme }
    var versionDescription: String {
        "Version \(information(for: "CFBundleShortVersionString") ?? "—") " +
        "(\(information(for: "CFBundleVersion") ?? "—"))"
    }

    private func information(for key: String) -> String? {
        guard let value = appInformation[key] as? String,
              !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return value
    }
    func selectDifficulty(_ difficulty: Difficulty) { settingsFeature.selectDifficulty(difficulty) }
    func selectTheme(_ theme: ThemeChoice) { settingsFeature.selectTheme(theme) }
    func difficultyTitle(_ difficulty: Difficulty) -> String { difficulty.rawValue.capitalized }
    func themeTitle(_ theme: ThemeChoice) -> String { theme.rawValue.capitalized }
}
