import Foundation
@testable import HabitTrackerPro

@MainActor
final class TestPurchaseStore: PurchaseStore {
    var entitled = false
    var outcome: PurchaseOutcome = .purchased
    var failsVerification = false
    var failsOffer = false
    var failsPurchase = false
    var restoredAccess = false
    var purchaseCount = 0
    var finishCount = 0
    private var finishWaiter: CheckedContinuation<Void, Never>?
    private var expectedFinishCount = 0
    var updateContinuation: AsyncStream<Void>.Continuation?
    var entitlementGate: CheckedContinuation<Bool, Never>?
    var holdsNextEntitlement = false
    private var entitlementStarted = false
    private var startWaiter: CheckedContinuation<Void, Never>?

    func offer() async throws -> PurchaseOffer {
        if failsOffer { throw PurchaseError.unavailable }
        return PurchaseOffer(title: "Unlock Trends", displayPrice: "$4.99")
    }
    func purchase() async throws -> PurchaseOutcome {
        purchaseCount += 1
        if failsPurchase { throw PurchaseError.unavailable }
        if case .purchased = outcome { entitled = true }
        return outcome
    }
    func hasTrendsAccess() async throws -> Bool {
        if failsVerification { throw PurchaseError.unverified }
        if holdsNextEntitlement {
            holdsNextEntitlement = false
            entitlementStarted = true
            startWaiter?.resume()
            startWaiter = nil
            return await withCheckedContinuation { entitlementGate = $0 }
        }
        return entitled
    }
    func restore() async throws { entitled = restoredAccess }
    func updates() -> AsyncStream<Void> {
        AsyncStream { updateContinuation = $0 }
    }
    func finishTransactions() async {
        finishCount += 1
        if finishCount >= expectedFinishCount {
            finishWaiter?.resume()
            finishWaiter = nil
        }
    }
    func waitForFinishes(_ count: Int) async {
        if finishCount >= count { return }
        expectedFinishCount = count
        await withCheckedContinuation { finishWaiter = $0 }
    }
    func waitForEntitlementRead() async {
        if entitlementStarted { return }
        await withCheckedContinuation { startWaiter = $0 }
    }
}
