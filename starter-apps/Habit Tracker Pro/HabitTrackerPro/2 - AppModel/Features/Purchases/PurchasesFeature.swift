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
        guard !isLoadingOffer else { return }
        isLoadingOffer = true
        defer { isLoadingOffer = false }
        do {
            offer = try await store.offer()
            offerError = nil
        } catch {
            offerError = error.localizedDescription
        }
    }

    func refreshEntitlement() async {
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
        guard !isPurchasingOrRestoring, !hasTrendsAccess, !isPurchasePending else { return }
        isPurchasingOrRestoring = true
        actionError = nil
        notice = nil
        defer { isPurchasingOrRestoring = false }
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

    func restorePurchases() async {
        guard !isPurchasingOrRestoring else { return }
        isPurchasingOrRestoring = true
        actionError = nil
        notice = nil
        defer { isPurchasingOrRestoring = false }
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
