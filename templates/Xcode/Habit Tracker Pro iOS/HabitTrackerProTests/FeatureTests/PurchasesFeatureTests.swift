import Testing
@testable import HabitTrackerPro

@Suite("Trends purchases", .timeLimit(.minutes(1)))
@MainActor
struct PurchasesFeatureTests {
    @Test func transactionUpdatesRefreshAndRevokeAccess() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        await feature.prepare()
        store.entitled = true
        store.updateContinuation?.yield(())
        await store.waitForFinishes(2)
        #expect(feature.hasTrendsAccess)
        store.entitled = false
        store.updateContinuation?.yield(())
        await store.waitForFinishes(3)
        #expect(!feature.hasTrendsAccess)
        store.updateContinuation?.finish()
    }

    @Test func verifiedPurchaseAndDuplicateProtection() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        await feature.prepare()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.offer?.displayPrice == "$4.99")
        await feature.purchaseTrends()
        await feature.purchaseTrends()
        #expect(feature.hasTrendsAccess)
        #expect(store.purchaseCount == 1)
        #expect(!feature.isBusy)
    }

    @Test func cancelledAndPendingDoNotUnlock() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        store.outcome = .cancelled
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.errorMessage == nil)
        store.outcome = .pending
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.isPending)
        #expect(feature.notice != nil)
        store.entitled = true
        await feature.refreshEntitlement()
        #expect(feature.hasTrendsAccess)
        #expect(!feature.isPending)
    }

    @Test func restoresAndRevokes() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        await feature.restorePurchases()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.notice != nil)
        store.restoredAccess = true
        await feature.restorePurchases()
        #expect(feature.hasTrendsAccess)
        store.entitled = false
        await feature.refreshEntitlement()
        #expect(!feature.hasTrendsAccess)
    }

    @Test func failuresAndRetry() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        store.failsOffer = true
        await feature.loadOffer()
        #expect(feature.offer == nil)
        #expect(feature.errorMessage != nil)
        store.failsOffer = false
        await feature.loadOffer()
        #expect(feature.offer != nil)
        store.failsPurchase = true
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.errorMessage != nil)
        store.failsPurchase = false
        store.failsVerification = true
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.errorMessage != nil)
        store.failsVerification = false
        await feature.refreshEntitlement()
        #expect(feature.hasTrendsAccess)
    }

    @Test func staleEntitlementCannotUndoRevocation() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        store.holdsNextEntitlement = true
        let oldRead = Task { await feature.refreshEntitlement() }
        await store.waitForEntitlementRead()
        await feature.refreshEntitlement()
        store.entitlementGate?.resume(returning: true)
        await oldRead.value
        #expect(!feature.hasTrendsAccess)
    }
}
