import StoreKit

@MainActor
final class StoreKitManager: PurchaseStore {
    static let trendsProductID = "com.3DaysOfSwiftConcurrency.HabitTrackerPro.trends"
    private var product: Product?
    private var unfinishedTransactions: [UInt64: Transaction] = [:]

    func offer() async throws -> PurchaseOffer {
        guard let product = try await Product.products(for: [Self.trendsProductID]).first else {
            throw PurchaseError.unavailable
        }
        self.product = product
        return PurchaseOffer(title: product.displayName, displayPrice: product.displayPrice)
    }

    func purchase() async throws -> PurchaseOutcome {
        if product == nil { _ = try await offer() }
        guard let product else { throw PurchaseError.unavailable }
        switch try await product.purchase() {
        case .success(let verification):
            guard case .verified(let transaction) = verification,
                  transaction.productID == Self.trendsProductID else {
                throw PurchaseError.unverified
            }
            unfinishedTransactions[transaction.id] = transaction
            return .purchased
        case .pending: return .pending
        case .userCancelled: return .cancelled
        @unknown default: throw PurchaseError.unavailable
        }
    }

    func hasTrendsAccess() async throws -> Bool {
        for await verification in Transaction.currentEntitlements {
            switch verification {
            case .verified(let transaction):
                if transaction.productID == Self.trendsProductID,
                   transaction.revocationDate == nil, !transaction.isUpgraded {
                    return true
                }
            case .unverified(let transaction, _):
                if transaction.productID == Self.trendsProductID { throw PurchaseError.unverified }
            }
        }
        return false
    }

    func restore() async throws { try await AppStore.sync() }

    func updates() -> AsyncStream<Void> {
        AsyncStream { continuation in
            let task = Task { [weak self] in
                for await verification in Transaction.updates {
                    guard !Task.isCancelled else { break }
                    if case .verified(let transaction) = verification,
                       transaction.productID == Self.trendsProductID {
                        self?.unfinishedTransactions[transaction.id] = transaction
                    }
                    // Re-read verified entitlements, including revocations and
                    // unverified updates. Never grant access from a callback alone.
                    continuation.yield(())
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    func finishTransactions() async {
        let transactions = unfinishedTransactions
        unfinishedTransactions = [:]
        for transaction in transactions.values { await transaction.finish() }
    }
}
