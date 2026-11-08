import Foundation
import Observation

@MainActor
@Observable
final class PurchasesFeature {
    private let store: any PurchaseStore
    private var entitlementRevision = 0
    private(set) var hasTrendsAccess = false
    private(set) var offer: PurchaseOffer?
    private(set) var isLoadingOffer = false
    private(set) var isPurchasingOrRestoring = false
    private(set) var isPurchasePending = false
    private var entitlementError: String?
    private var offerError: String?
    private var actionError: String?
    var errorMessage: String? { entitlementError ?? actionError ?? offerError }
    private(set) var notice: String?

    init(store: any PurchaseStore) { self.store = store }

    @ObservationIgnored private var startupTask: Task<Void, Never>?
    @ObservationIgnored private var offerTask: Task<Void, Never>?
    private enum PurchaseAction { case purchase, restore }
    @ObservationIgnored private var lastAction: (id: UUID, kind: PurchaseAction, task: Task<Void, Never>)?

    func startLoading() {
        guard startupTask == nil else { return }
        startupTask = Task { [weak self] in
            await self?.prepare()
            self?.startupTask = nil
        }
    }

    func prepare() async {
        await refreshEntitlement()
        await loadOffer()
    }

    func transactionUpdates() -> AsyncStream<Void> { store.updates() }

    func loadOffer() async {
        if let offerTask {
            await offerTask.value
            return
        }
        isLoadingOffer = true
        let task = Task { @MainActor in
            defer { isLoadingOffer = false; offerTask = nil }
            do {
                offer = try await store.offer()
                offerError = nil
            } catch {
                offerError = error.localizedDescription
            }
        }
        offerTask = task
        await task.value
    }

    func refreshEntitlement() async {
        // A newer StoreKit event may change access while an earlier read is suspended.
        // Only the latest read may publish its result.
        entitlementRevision += 1
        let revision = entitlementRevision
        do {
            let hasAccess = try await store.hasTrendsAccess()
            guard revision == entitlementRevision else { return }
            hasTrendsAccess = hasAccess
            entitlementError = nil
            if hasAccess {
                isPurchasePending = false
                notice = nil
                actionError = nil
            }
            // Deliver/revoke access before acknowledging verified transactions.
            await store.finishTransactions()
        } catch {
            guard revision == entitlementRevision else { return }
            hasTrendsAccess = false
            entitlementError = error.localizedDescription
        }
    }

    func purchaseTrends() async {
        await enqueue(.purchase).value
    }

    func restorePurchases() async {
        await enqueue(.restore).value
    }

    // StoreKit actions cannot overlap. Adjacent equivalent requests share a result;
    // different requests run in their admission order, even after an earlier failure.
    private func enqueue(_ kind: PurchaseAction) -> Task<Void, Never> {
        if let lastAction, lastAction.kind == kind { return lastAction.task }
        let previous = lastAction?.task
        let id = UUID()
        isPurchasingOrRestoring = true
        let task = Task { @MainActor in
            await previous?.value
            switch kind {
            case .purchase: await performPurchase()
            case .restore: await performRestore()
            }
            if lastAction?.id == id {
                lastAction = nil
                isPurchasingOrRestoring = false
            }
        }
        lastAction = (id, kind, task)
        return task
    }

    private func performPurchase() async {
        guard !hasTrendsAccess, !isPurchasePending else { return }
        actionError = nil
        notice = nil
        do {
            switch try await store.purchase() {
            case .purchased:
                await refreshEntitlement()
                if !hasTrendsAccess && entitlementError == nil { actionError = PurchaseError.unverified.localizedDescription }
            case .pending:
                isPurchasePending = true
                notice = "Your purchase is awaiting approval. Trends will unlock after it is approved."
            case .cancelled:
                break
            }
        } catch {
            actionError = error.localizedDescription
        }
    }

    private func performRestore() async {
        actionError = nil
        notice = nil
        do {
            try await store.restore()
            await refreshEntitlement()
            if !hasTrendsAccess && errorMessage == nil {
                notice = "No Trends purchase was found for this Apple Account."
            }
        } catch {
            actionError = error.localizedDescription
        }
    }
}
