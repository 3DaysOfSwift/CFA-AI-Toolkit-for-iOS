import Foundation
import Testing
@testable import HabitTrackerPro

@Suite("Trends screen")
@MainActor
struct TrendsViewModelTests {
    @Test func selectionSharedChangesAndAccess() async throws {
        let first = Habit(id: UUID(), name: "Read", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        let second = Habit(id: UUID(), name: "Run", tracking: .count, unit: "km", dailyTarget: 5, entries: [])
        let habits = HabitsFeature(repository: InMemoryHabitsRepository(habits: [first, second]))
        await habits.reload()
        let store = TestPurchaseStore()
        let purchases = PurchasesFeature(store: store)
        let feature = TrendsFeature(habitsFeature: habits, purchasesFeature: purchases)
        let viewModel = TrendsViewModel(trendsFeature: feature)
        #expect(!viewModel.hasAccess)
        #expect(viewModel.selectedTrend == nil)
        await purchases.purchaseTrends()
        #expect(viewModel.selectedTrend?.id == first.id)
        viewModel.selectedID = second.id
        try await habits.recordToday(habitID: second.id, value: 5)
        #expect(viewModel.selectedTrend?.completedDays == 1)
        store.entitled = false
        await purchases.refreshEntitlement()
        #expect(viewModel.selectedTrend == nil)
    }
}
