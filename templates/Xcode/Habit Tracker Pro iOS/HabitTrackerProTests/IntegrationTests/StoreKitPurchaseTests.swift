import Foundation
import StoreKit
import StoreKitTest
import Testing
import Observation
import XCTest
@testable import HabitTrackerPro

private final class StoreKitTestBundle: NSObject {}

@Suite("Local StoreKit purchase lifecycle", .serialized, .timeLimit(.minutes(2)))
@MainActor
struct StoreKitPurchaseTests {
    @Test func purchaseRelaunchAndRefund() async throws {
        let url = try #require(Bundle(for: StoreKitTestBundle.self).url(forResource: "Trends", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        defer { session.clearTransactions() }

        let store = StoreKitManager()
        let offer = try await store.offer()
        #expect(!offer.displayPrice.isEmpty)
        #expect(try await store.currentEntitlement() == false)
        let feature = PurchasesFeature(store: store)
        await feature.purchaseTrends()
        #expect(feature.hasTrendsAccess)
        #expect(feature.errorMessage == nil)

        let relaunched = PurchasesFeature(store: StoreKitManager())
        await relaunched.prepare()
        #expect(relaunched.hasTrendsAccess)
        let transaction = try #require(session.allTransactions().first)
        let revoked = XCTestExpectation(description: "StoreKit revocation reaches the feature")
        withObservationTracking {
            _ = relaunched.hasTrendsAccess
        } onChange: {
            revoked.fulfill()
        }
        try session.refundTransaction(identifier: transaction.identifier)
        // Await the already-running production update listener with a bounded
        // expectation. No timing sleep or second manual refresh hides a failure.
        let outcome = await XCTWaiter.fulfillment(of: [revoked], timeout: 15)
        #expect(outcome == .completed)
        #expect(!relaunched.hasTrendsAccess)
    }
}
