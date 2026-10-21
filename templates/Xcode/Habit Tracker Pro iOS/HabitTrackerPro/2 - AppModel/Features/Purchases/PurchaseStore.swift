import Foundation

struct PurchaseOffer: Equatable, Sendable {
    let title: String
    let displayPrice: String
}

enum PurchaseOutcome: Sendable {
    case purchased
    case pending
    case cancelled
}

/// The external StoreKit boundary, replaced by controlled stores in tests.
@MainActor
protocol PurchaseStore: AnyObject {
    func offer() async throws -> PurchaseOffer
    func purchase() async throws -> PurchaseOutcome
    func currentEntitlement() async throws -> Bool
    func restore() async throws
    func updates() -> AsyncStream<Void>
    func finishTransactions() async
}

enum PurchaseError: LocalizedError {
    case unavailable
    case unverified

    var errorDescription: String? {
        switch self {
        case .unavailable: "The Trends purchase is unavailable. Please try again later."
        case .unverified: "We couldn’t verify your purchase. Please try Restore Purchases."
        }
    }
}
