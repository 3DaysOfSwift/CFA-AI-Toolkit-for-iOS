import Foundation
import Observation

enum PurchaseNotice: Equatable {
    case pendingApproval
    case noPurchaseFound
}

@MainActor
@Observable
final class PurchasesFeature {
    private let store: any PurchaseStore
    private(set) var hasTrendsAccess = false
    private(set) var offer: PurchaseOffer?
    private(set) var isLoadingOffer = false
    private(set) var isPurchasingOrRestoring = false
    private(set) var isPurchasePending = false
    private var entitlementError: (any Error)?
    private var offerError: (any Error)?
    private var actionError: (any Error)?
    var error: (any Error)? { entitlementError ?? actionError ?? offerError }
    private(set) var notice: PurchaseNotice?

    init(store: any PurchaseStore) { self.store = store }

    @ObservationIgnored private var startupTask: Task<Void, Never>?
    @ObservationIgnored private var offerTask: Task<Void, Never>?
    @ObservationIgnored private var entitlementTask: Task<Void, Never>?
    @ObservationIgnored private var entitlementRefreshRequested = false
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

    deinit {
        startupTask?.cancel()
        offerTask?.cancel()
        entitlementTask?.cancel()
        lastAction?.task.cancel()
    }

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
                offerError = error
            }
        }
        offerTask = task
        await task.value
    }

    func refreshEntitlement() async {
        requestEntitlementRefresh()
        await entitlementTask?.value
    }

    func requestEntitlementRefresh() {
        entitlementRefreshRequested = true
        guard entitlementTask == nil else { return }
        let task = Task { [weak self] in
            guard let self else { return }
            await self.drainEntitlementRefreshes()
        }
        entitlementTask = task
    }

    private func drainEntitlementRefreshes() async {
        while entitlementRefreshRequested, !Task.isCancelled {
            entitlementRefreshRequested = false
            await performEntitlementRefresh()
        }
        entitlementTask = nil
    }

    private func performEntitlementRefresh() async {
        do {
            let hasAccess = try await store.hasTrendsAccess()
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
            hasTrendsAccess = false
            entitlementError = error
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
                if !hasTrendsAccess && entitlementError == nil { actionError = PurchaseError.unverified }
            case .pending:
                isPurchasePending = true
                notice = .pendingApproval
            case .cancelled:
                break
            }
        } catch {
            actionError = error
        }
    }

    private func performRestore() async {
        actionError = nil
        notice = nil
        do {
            try await store.restore()
            await refreshEntitlement()
            if !hasTrendsAccess && error == nil {
                notice = .noPurchaseFound
            }
        } catch {
            actionError = error
        }
    }
}
