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
    var errorMessage: String? { purchasesFeature.errorMessage }
    var notice: String? { purchasesFeature.notice }
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
}
