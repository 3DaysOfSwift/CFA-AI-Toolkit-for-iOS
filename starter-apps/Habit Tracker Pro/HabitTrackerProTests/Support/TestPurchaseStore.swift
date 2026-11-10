import Foundation
@testable import HabitTrackerPro

@MainActor
final class TestPurchaseStore: PurchaseStore {
    var entitled = false
    var outcome: PurchaseOutcome = .purchased
    var failsVerification = false
    var failsOffer = false
    var holdsOffer = false
    var offerGate: CheckedContinuation<Void, Never>?
    private(set) var offerCount = 0
    var failsPurchase = false
    var restoredAccess = false
    var purchaseCount = 0
    var holdsPurchase = false
    var purchaseGate: CheckedContinuation<Void, Never>?
    private(set) var restoreCount = 0
    private(set) var updateSubscriptionCount = 0
    var finishCount = 0
    private var finishWaiter: CheckedContinuation<Void, Never>?
    private var expectedFinishCount = 0
    var updateContinuation: AsyncStream<Void>.Continuation?
    var onUpdateTermination: (@Sendable (AsyncStream<Void>.Continuation.Termination) -> Void)?
    var entitlementGate: CheckedContinuation<Bool, Never>?
    var holdsNextEntitlement = false
    private var entitlementStarted = false
    private var startWaiter: CheckedContinuation<Void, Never>?

    func offer() async throws -> PurchaseOffer {
        offerCount += 1
        if holdsOffer { await withCheckedContinuation { offerGate = $0 } }
        if failsOffer { throw PurchaseError.unavailable }
        return PurchaseOffer(displayPrice: "$4.99")
    }
    func purchase() async throws -> PurchaseOutcome {
        purchaseCount += 1
        if holdsPurchase { await withCheckedContinuation { purchaseGate = $0 } }
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
    func restore() async throws { restoreCount += 1; entitled = restoredAccess }
    func updates() -> AsyncStream<Void> {
        updateSubscriptionCount += 1
        let onTermination = onUpdateTermination
        return AsyncStream {
            updateContinuation = $0
            $0.onTermination = onTermination
        }
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
