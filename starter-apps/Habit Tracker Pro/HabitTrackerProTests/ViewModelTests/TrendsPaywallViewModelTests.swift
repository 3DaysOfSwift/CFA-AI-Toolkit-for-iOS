import Testing
@testable import HabitTrackerPro

@Suite("Trends paywall")
@MainActor
struct TrendsPaywallViewModelTests {
    @Test func localizedPricePendingAndRestore() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        let viewModel = TrendsPaywallViewModel(purchasesFeature: feature)
        #expect(!viewModel.canPurchase)
        await viewModel.retry()
        #expect(viewModel.purchaseTitle == "Unlock Trends · $4.99")
        #expect(viewModel.canPurchase)
        store.outcome = .pending
        await viewModel.purchase()
        #expect(!viewModel.canPurchase)
        #expect(viewModel.notice != nil)
        store.restoredAccess = true
        await viewModel.restore()
        #expect(feature.hasTrendsAccess)
    }
}
