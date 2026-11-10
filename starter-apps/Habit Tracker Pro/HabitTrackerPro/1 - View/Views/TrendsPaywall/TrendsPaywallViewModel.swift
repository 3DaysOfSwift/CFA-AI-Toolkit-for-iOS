import Observation

@MainActor
@Observable
final class TrendsPaywallViewModel {
    private let purchasesFeature: PurchasesFeature

    init(purchasesFeature: PurchasesFeature = AppModel.shared.purchasesFeature) {
        self.purchasesFeature = purchasesFeature
    }

    var purchaseTitle: String {
        guard let offer = purchasesFeature.offer else {
            return isLoadingOffer ? "Loading price…" : "Purchase unavailable"
        }
        return "Unlock Trends · \(offer.displayPrice)"
    }
    var canPurchase: Bool {
        purchasesFeature.offer != nil && !isPurchasingOrRestoring && !purchasesFeature.isPurchasePending && !purchasesFeature.hasTrendsAccess
    }
    var isPurchasingOrRestoring: Bool { purchasesFeature.isPurchasingOrRestoring }
    var isLoadingOffer: Bool { purchasesFeature.isLoadingOffer }
    var errorMessage: String? { purchasesFeature.error.map(message(for:)) }
    var notice: String? {
        switch purchasesFeature.notice {
        case .pendingApproval:
            "Your purchase is awaiting approval. Trends will unlock after it is approved."
        case .noPurchaseFound:
            "No Trends purchase was found for this Apple Account."
        case nil:
            nil
        }
    }
    @ObservationIgnored private var purchaseTask: Task<Void, Never>?
    @discardableResult
    func purchase() -> Task<Void, Never> {
        if let purchaseTask { return purchaseTask }
        let task = Task { [weak self, purchasesFeature] in
            defer { self?.purchaseTask = nil }
            await purchasesFeature.purchaseTrends()
        }
        purchaseTask = task
        return task
    }
    @ObservationIgnored private var restoreTask: Task<Void, Never>?
    @discardableResult
    func restore() -> Task<Void, Never> {
        if let restoreTask { return restoreTask }
        let task = Task { [weak self, purchasesFeature] in
            defer { self?.restoreTask = nil }
            await purchasesFeature.restorePurchases()
        }
        restoreTask = task
        return task
    }
    @ObservationIgnored private var retryTask: Task<Void, Never>?
    @discardableResult
    func retry() -> Task<Void, Never> {
        if let retryTask { return retryTask }
        let task = Task { [weak self, purchasesFeature] in
            defer { self?.retryTask = nil }
            await purchasesFeature.prepare()
        }
        retryTask = task
        return task
    }

    private func message(for error: any Error) -> String {
        switch error {
        case PurchaseError.unavailable:
            "The Trends purchase is unavailable. Please try again later."
        case PurchaseError.unverified:
            "We couldn’t verify your purchase. Please try Restore Purchases."
        default:
            "Something went wrong with the Trends purchase. Please try again."
        }
    }
}
