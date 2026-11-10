import Foundation
import Testing
@testable import HabitTrackerPro

@Suite("Trends purchases", .timeLimit(.minutes(1)))
@MainActor
struct PurchasesFeatureTests {
    @Test func cancellingPurchaseWaiterDoesNotStrandRestore() async {
        let store = TestPurchaseStore()
        store.holdsPurchase = true
        store.restoredAccess = true
        let feature = PurchasesFeature(store: store)
        let purchase = Task { await feature.purchaseTrends() }
        while store.purchaseGate == nil { await Task.yield() }
        var restoreStarted = false
        let restore = Task {
            restoreStarted = true
            await feature.restorePurchases()
        }
        while !restoreStarted { await Task.yield() }
        purchase.cancel()
        #expect(store.restoreCount == 0 && feature.isPurchasingOrRestoring)
        store.holdsPurchase = false
        store.purchaseGate?.resume()
        store.purchaseGate = nil
        await purchase.value
        await restore.value
        #expect(store.purchaseCount == 1 && store.restoreCount == 1)
        #expect(feature.hasTrendsAccess && !feature.isPurchasingOrRestoring)
    }
    @Test func overlappingPurchasesShareCompletion() async {
        let store = TestPurchaseStore()
        store.holdsPurchase = true
        let feature = PurchasesFeature(store: store)
        let first = Task { await feature.purchaseTrends() }
        while store.purchaseGate == nil { await Task.yield() }
        var started = false
        var finished = false
        let second = Task {
            started = true
            await feature.purchaseTrends()
            finished = true
        }
        while !started { await Task.yield() }
        #expect(!finished && store.purchaseCount == 1)
        store.holdsPurchase = false
        store.purchaseGate?.resume()
        store.purchaseGate = nil
        await first.value
        await second.value
        #expect(finished && feature.hasTrendsAccess && !feature.isPurchasingOrRestoring)
    }
    @Test func restoreWaitsForAnOverlappingPurchase() async {
        let store = TestPurchaseStore()
        store.holdsPurchase = true
        store.failsPurchase = true
        store.restoredAccess = true
        let feature = PurchasesFeature(store: store)
        let purchase = Task { await feature.purchaseTrends() }
        while store.purchaseGate == nil { await Task.yield() }
        var restoreStarted = false
        var restoreFinished = false
        let restore = Task {
            restoreStarted = true
            await feature.restorePurchases()
            restoreFinished = true
        }
        while !restoreStarted { await Task.yield() }
        #expect(!restoreFinished && store.restoreCount == 0)
        #expect(feature.isPurchasingOrRestoring)
        store.holdsPurchase = false
        store.purchaseGate?.resume()
        store.purchaseGate = nil
        await purchase.value
        await restore.value
        #expect(restoreFinished && store.restoreCount == 1)
        #expect(feature.hasTrendsAccess && !feature.isPurchasingOrRestoring)
    }
    @Test func overlappingOfferLoadsWaitForOneRequest() async {
        let store = TestPurchaseStore()
        store.holdsOffer = true
        let feature = PurchasesFeature(store: store)
        let first = Task { await feature.loadOffer() }
        while store.offerGate == nil { await Task.yield() }
        var secondStarted = false
        var secondFinished = false
        let second = Task {
            secondStarted = true
            await feature.loadOffer()
            secondFinished = true
        }
        while !secondStarted { await Task.yield() }
        #expect(!secondFinished)
        #expect(store.offerCount == 1)
        store.holdsOffer = false
        store.offerGate?.resume()
        store.offerGate = nil
        await first.value
        await second.value
        #expect(secondFinished && feature.offer != nil && !feature.isLoadingOffer)
    }
    @Test func transactionUpdatesRefreshAndRevokeAccess() async throws {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        let habits = HabitsFeature(repository: InMemoryHabitsRepository())
        let suiteName = "HabitTrackerPro.PurchaseUpdates.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let appModel = AppModel(todayFeature: TodayFeature(habitsFeature: habits),
                             habitsFeature: habits,
                             dayStreakFeature: DayStreakFeature(habitsFeature: habits),
                             settingsFeature: SettingsFeature(defaults: defaults),
                             purchasesFeature: feature,
                             trendsFeature: TrendsFeature(habitsFeature: habits))
        appModel.applicationDidFinishLaunching()
        appModel.applicationDidFinishLaunching()
        #expect(store.updateSubscriptionCount == 1)
        await store.waitForFinishes(1)
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
        #expect(!feature.isPurchasingOrRestoring)
    }

    @Test func cancelledAndPendingDoNotUnlock() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        store.outcome = .cancelled
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.error == nil)
        store.outcome = .pending
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.isPurchasePending)
        #expect(feature.notice != nil)
        store.entitled = true
        await feature.refreshEntitlement()
        #expect(feature.hasTrendsAccess)
        #expect(!feature.isPurchasePending)
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
        #expect(feature.error != nil)
        store.failsOffer = false
        await feature.loadOffer()
        #expect(feature.offer != nil)
        store.failsPurchase = true
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.error != nil)
        store.failsPurchase = false
        store.failsVerification = true
        await feature.purchaseTrends()
        #expect(!feature.hasTrendsAccess)
        #expect(feature.error != nil)
        store.failsVerification = false
        await feature.refreshEntitlement()
        #expect(feature.hasTrendsAccess)
    }

    @Test func successfulOfferDoesNotHideEntitlementFailure() async {
        let store = TestPurchaseStore()
        let feature = PurchasesFeature(store: store)
        store.failsVerification = true
        await feature.prepare()
        #expect(feature.offer != nil)
        #expect(feature.error != nil)
        #expect(!feature.hasTrendsAccess)

        store.failsVerification = false
        await feature.refreshEntitlement()
        #expect(feature.error == nil)
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
