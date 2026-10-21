import Foundation

@MainActor
final class AppModel {
    static let shared = live()
    let practiceFeature: PracticeFeature
    let dayStreakFeature: DayStreakFeature
    let settingsFeature: SettingsFeature
    private var didFinishLaunching: Bool

    init(practiceFeature: PracticeFeature, dayStreakFeature: DayStreakFeature, settingsFeature: SettingsFeature) {
        self.practiceFeature = practiceFeature
        self.dayStreakFeature = dayStreakFeature
        self.settingsFeature = settingsFeature
        didFinishLaunching = false
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

    func applicationDidFinishLaunching() {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
        // No database boot gate. Each requesting feature reports its own operation failures.
    }
}
