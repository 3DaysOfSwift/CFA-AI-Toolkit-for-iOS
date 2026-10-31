import Foundation
import Observation

@MainActor
@Observable
final class PurchasesFeature {
    private let store: any PurchaseStore
    @ObservationIgnored private var updatesTask: Task<Void, Never>?
    private var entitlementRevision = 0
    private(set) var hasTrendsAccess = false
    private(set) var offer: PurchaseOffer?
    private(set) var isLoadingOffer = false
    private(set) var isPurchasingOrRestoring = false
    private(set) var isPurchasePending = false
    private(set) var errorMessage: String?
    private(set) var notice: String?

    init(store: any PurchaseStore) { self.store = store }

    deinit { updatesTask?.cancel() }

    @ObservationIgnored private var startupTask: Task<Void, Never>?

    func startLoading() {
        guard startupTask == nil else { return }
        startupTask = Task { [weak self] in
            await self?.prepare()
            self?.startupTask = nil
        }
    }

    func prepare() async {
        if updatesTask == nil {
            let updates = store.updates()
            updatesTask = Task { [weak self] in
                for await _ in updates {
                    guard !Task.isCancelled else { break }
                    await self?.refreshEntitlement()
                }
            }
        }
        await refreshEntitlement()
        await loadOffer()
    }

    func loadOffer() async {
        guard !isLoadingOffer else { return }
        isLoadingOffer = true
        defer { isLoadingOffer = false }
        do {
            offer = try await store.offer()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshEntitlement() async {
        entitlementRevision += 1
        let revision = entitlementRevision
        do {
            let hasAccess = try await store.hasTrendsAccess()
            guard revision == entitlementRevision else { return }
            hasTrendsAccess = hasAccess
            if hasAccess {
                isPurchasePending = false
                notice = nil
                errorMessage = nil
            }
            // Deliver/revoke access before acknowledging verified transactions.
            await store.finishTransactions()
        } catch {
            guard revision == entitlementRevision else { return }
            hasTrendsAccess = false
            errorMessage = error.localizedDescription
        }
    }

    func purchaseTrends() async {
        guard !isPurchasingOrRestoring, !hasTrendsAccess, !isPurchasePending else { return }
        isPurchasingOrRestoring = true
        errorMessage = nil
        notice = nil
        defer { isPurchasingOrRestoring = false }
        do {
            switch try await store.purchase() {
            case .purchased:
                await refreshEntitlement()
                if !hasTrendsAccess { errorMessage = PurchaseError.unverified.localizedDescription }
            case .pending:
                isPurchasePending = true
                notice = "Your purchase is awaiting approval. Trends will unlock after it is approved."
            case .cancelled:
                break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func restorePurchases() async {
        guard !isPurchasingOrRestoring else { return }
        isPurchasingOrRestoring = true
        errorMessage = nil
        notice = nil
        defer { isPurchasingOrRestoring = false }
        do {
            try await store.restore()
            await refreshEntitlement()
            if !hasTrendsAccess && errorMessage == nil {
                notice = "No Trends purchase was found for this Apple Account."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
