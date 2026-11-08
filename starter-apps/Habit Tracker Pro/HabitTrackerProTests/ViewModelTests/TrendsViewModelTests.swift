import Foundation
import Testing
@testable import HabitTrackerPro

@Suite("Trends screen")
@MainActor
struct TrendsViewModelTests {
    @Test func retryRequiresCurrentTrendsAccess() async {
        let repository = CountingHabitsRepository()
        let habits = HabitsFeature(repository: repository)
        let store = TestPurchaseStore()
        let purchases = PurchasesFeature(store: store)
        let viewModel = TrendsViewModel(trendsFeature: TrendsFeature(habitsFeature: habits), purchasesFeature: purchases)

        await viewModel.retry().value
        #expect(await repository.fetchCount == 0)

        await purchases.purchaseTrends()
        await viewModel.retry().value
        #expect(await repository.fetchCount == 1)

        store.entitled = false
        await purchases.refreshEntitlement()
        await viewModel.retry().value
        #expect(await repository.fetchCount == 1)
    }

    @Test func lockedTrendsDoNotExposeFeatureLoadingErrors() async {
        let habits = HabitsFeature(repository: UnavailableHabitsRepository())
        await habits.reload()
        let store = TestPurchaseStore()
        let purchases = PurchasesFeature(store: store)
        let viewModel = TrendsViewModel(trendsFeature: TrendsFeature(habitsFeature: habits), purchasesFeature: purchases)

        #expect(!viewModel.isLoading)
        #expect(viewModel.loadError == nil)
        await purchases.purchaseTrends()
        #expect(viewModel.loadError != nil)
        store.entitled = false
        await purchases.refreshEntitlement()
        #expect(viewModel.loadError == nil)
    }

    @Test func selectionSharedChangesAndAccess() async throws {
        let first = Habit(id: UUID(), name: "Read", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        let second = Habit(id: UUID(), name: "Run", tracking: .count, unit: "km", dailyTarget: 5, entries: [])
        let habits = HabitsFeature(repository: InMemoryHabitsRepository(habits: [first, second]))
        await habits.reload()
        let store = TestPurchaseStore()
        let purchases = PurchasesFeature(store: store)
        let feature = TrendsFeature(habitsFeature: habits)
        let viewModel = TrendsViewModel(trendsFeature: feature, purchasesFeature: purchases)
        #expect(!viewModel.hasAccess)
        #expect(viewModel.trends.isEmpty)
        #expect(viewModel.selectedTrend == nil)
        await purchases.purchaseTrends()
        #expect(viewModel.selectedTrend?.id == first.id)
        viewModel.selectedID = second.id
        try await habits.recordToday(habitID: second.id, value: 5)
        #expect(viewModel.selectedTrend?.completedDayCount == 1)
        store.entitled = false
        await purchases.refreshEntitlement()
        #expect(viewModel.selectedTrend == nil)
    }
}

private actor CountingHabitsRepository: HabitsRepository {
    private(set) var fetchCount = 0
    func fetchHabits() async throws -> [Habit] { fetchCount += 1; return [] }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}

private actor UnavailableHabitsRepository: HabitsRepository {
    func fetchHabits() async throws -> [Habit] { throw CocoaError(.fileReadNoPermission) }
    func insertHabit(_ habit: Habit) async throws {}
    func record(habitID: UUID, entryID: UUID, date: Date, value: Int) async throws {}
}
