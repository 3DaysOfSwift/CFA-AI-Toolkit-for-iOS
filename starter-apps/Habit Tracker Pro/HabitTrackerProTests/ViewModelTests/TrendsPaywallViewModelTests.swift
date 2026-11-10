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
        await viewModel.retry().value
        #expect(viewModel.purchaseTitle == "Unlock Trends · $4.99")
        #expect(viewModel.canPurchase)
        store.outcome = .pending
        await viewModel.purchase().value
        #expect(!viewModel.canPurchase)
        #expect(viewModel.notice == "Your purchase is awaiting approval. Trends will unlock after it is approved.")
        store.restoredAccess = true
        await viewModel.restore().value
        #expect(feature.hasTrendsAccess)
    }

    @Test func mapsPurchaseErrorsToPaywallCopy() async {
        let store = TestPurchaseStore()
        store.failsOffer = true
        let feature = PurchasesFeature(store: store)
        let viewModel = TrendsPaywallViewModel(purchasesFeature: feature)

        await viewModel.retry().value

        #expect(viewModel.errorMessage == "The Trends purchase is unavailable. Please try again later.")
    }
}
