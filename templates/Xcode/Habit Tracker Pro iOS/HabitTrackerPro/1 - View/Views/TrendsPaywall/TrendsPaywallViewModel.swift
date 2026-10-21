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
        purchasesFeature.offer != nil && !isBusy && !purchasesFeature.isPending && !purchasesFeature.hasTrendsAccess
    }
    var isBusy: Bool { purchasesFeature.isBusy }
    var isLoadingOffer: Bool { purchasesFeature.isLoadingOffer }
    var errorMessage: String? { purchasesFeature.errorMessage }
    var notice: String? { purchasesFeature.notice }
    func purchase() async { await purchasesFeature.purchaseTrends() }
    func restore() async { await purchasesFeature.restorePurchases() }
    func retry() async { await purchasesFeature.prepare() }
}
