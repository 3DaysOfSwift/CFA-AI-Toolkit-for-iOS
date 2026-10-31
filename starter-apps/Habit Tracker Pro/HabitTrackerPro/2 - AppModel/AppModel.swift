import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    static let shared = live()

    let todayFeature: TodayFeature
    let habitsFeature: HabitsFeature
    let dayStreakFeature: DayStreakFeature
    let settingsFeature: SettingsFeature
    let purchasesFeature: PurchasesFeature
    let trendsFeature: TrendsFeature
    private var didFinishLaunching: Bool

    init(todayFeature: TodayFeature, habitsFeature: HabitsFeature, dayStreakFeature: DayStreakFeature,
         settingsFeature: SettingsFeature, purchasesFeature: PurchasesFeature, trendsFeature: TrendsFeature) {
        self.todayFeature = todayFeature
        self.habitsFeature = habitsFeature
        self.dayStreakFeature = dayStreakFeature
        self.settingsFeature = settingsFeature
        self.purchasesFeature = purchasesFeature
        self.trendsFeature = trendsFeature
        didFinishLaunching = false
    }

    static func live() -> AppModel {
        let swiftDataManager = SwiftDataManager()
        let habitsFeature = HabitsFeature(repository: swiftDataManager)
        let purchasesFeature = PurchasesFeature(store: StoreKitManager())
        return AppModel(
            todayFeature: TodayFeature(habitsFeature: habitsFeature),
            habitsFeature: habitsFeature,
            dayStreakFeature: DayStreakFeature(habitsFeature: habitsFeature),
            settingsFeature: SettingsFeature(defaults: .standard),
            purchasesFeature: purchasesFeature,
            trendsFeature: TrendsFeature(habitsFeature: habitsFeature, purchasesFeature: purchasesFeature)
        )
    }

    func applicationDidFinishLaunching() {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
        habitsFeature.startLoading()
        purchasesFeature.startLoading()
    }

    func applicationDidBecomeActive() async {
        await purchasesFeature.refreshEntitlement()
    }
}
