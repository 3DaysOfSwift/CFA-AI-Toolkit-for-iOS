import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel.live()

    let todayFeature: TodayFeature
    let habitsFeature: HabitsFeature
    let dayStreakFeature: DayStreakFeature
    let settingsFeature: SettingsFeature
    let purchasesFeature: PurchasesFeature
    let trendsFeature: TrendsFeature
    private var didFinishLaunching: Bool
    private var transactionUpdatesTask: Task<Void, Never>?

    init(todayFeature: TodayFeature, habitsFeature: HabitsFeature, dayStreakFeature: DayStreakFeature,
         settingsFeature: SettingsFeature, purchasesFeature: PurchasesFeature, trendsFeature: TrendsFeature) {
        self.todayFeature = todayFeature
        self.habitsFeature = habitsFeature
        self.dayStreakFeature = dayStreakFeature
        self.settingsFeature = settingsFeature
        self.purchasesFeature = purchasesFeature
        self.trendsFeature = trendsFeature
        didFinishLaunching = false
        transactionUpdatesTask = nil
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
            trendsFeature: TrendsFeature(habitsFeature: habitsFeature)
        )
    }

    deinit { transactionUpdatesTask?.cancel() }

    func applicationDidFinishLaunching() {
        guard !didFinishLaunching else { return }
        didFinishLaunching = true
        let updates = purchasesFeature.transactionUpdates()
        transactionUpdatesTask = Task { [purchasesFeature] in
            for await _ in updates {
                guard !Task.isCancelled else { break }
                purchasesFeature.requestEntitlementRefresh()
            }
        }
        habitsFeature.startLoading()
        purchasesFeature.startLoading()
    }

    func applicationDidBecomeActive() {
        purchasesFeature.requestEntitlementRefresh()
    }
}
