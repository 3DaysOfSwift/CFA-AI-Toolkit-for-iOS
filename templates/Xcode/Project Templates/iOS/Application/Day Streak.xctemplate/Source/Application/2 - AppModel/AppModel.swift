import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()
    let practiceFeature: PracticeFeature
    let dayStreakFeature: DayStreakFeature
    let settingsFeature: SettingsFeature

    init(practiceFeature: PracticeFeature, dayStreakFeature: DayStreakFeature, settingsFeature: SettingsFeature) {
        self.practiceFeature = practiceFeature
        self.dayStreakFeature = dayStreakFeature
        self.settingsFeature = settingsFeature
    }

    static func live() -> AppModel {
        let storeURL = URL.applicationSupportDirectory
            .appending(path: "___PACKAGENAMEASIDENTIFIER___", directoryHint: .isDirectory)
            .appending(path: "Sessions.store")
        let repository = SwiftDataManager(storeURL: storeURL)
        let practiceFeature = PracticeFeature(repository: repository)
        let dayStreakFeature = DayStreakFeature(practiceFeature: practiceFeature)
        let settingsFeature = SettingsFeature(defaults: .standard)
        return AppModel(practiceFeature: practiceFeature, dayStreakFeature: dayStreakFeature,
                        settingsFeature: settingsFeature)
    }

}
