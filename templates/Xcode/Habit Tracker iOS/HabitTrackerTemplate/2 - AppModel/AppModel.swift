import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    static let shared = live()

    let todayFeature: TodayFeature
    let habitsFeature: HabitsFeature
    let settingsFeature: SettingsFeature
    private var didFinishLaunching: Bool

    init(todayFeature: TodayFeature, habitsFeature: HabitsFeature, settingsFeature: SettingsFeature) {
        self.todayFeature = todayFeature
        self.habitsFeature = habitsFeature
        self.settingsFeature = settingsFeature
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        let swiftDataManager = SwiftDataManager()
        let habitsFeature = HabitsFeature(repository: swiftDataManager)
        return AppModel(
            todayFeature: TodayFeature(habitsFeature: habitsFeature),
            habitsFeature: habitsFeature,
            settingsFeature: SettingsFeature(defaults: .standard)
        )
    }

    func applicationDidFinishLaunching() async {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
        await habitsFeature.reload()
    }
}
