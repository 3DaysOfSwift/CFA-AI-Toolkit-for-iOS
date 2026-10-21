import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    static let shared = live()

    let habitsFeature: HabitsFeature
    let settingsFeature: SettingsFeature
    private var didFinishLaunching: Bool

    init(habitsFeature: HabitsFeature, settingsFeature: SettingsFeature) {
        self.habitsFeature = habitsFeature
        self.settingsFeature = settingsFeature
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        let swiftDataManager = SwiftDataManager()
        return AppModel(
            habitsFeature: HabitsFeature(repository: swiftDataManager),
            settingsFeature: SettingsFeature(defaults: .standard)
        )
    }

    func applicationDidFinishLaunching() async {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
        await habitsFeature.reload()
    }
}
