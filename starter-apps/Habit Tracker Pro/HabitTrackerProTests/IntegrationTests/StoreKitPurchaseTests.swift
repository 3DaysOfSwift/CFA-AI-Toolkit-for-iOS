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
        #expect(try await store.hasTrendsAccess() == false)
        let feature = PurchasesFeature(store: store)
        await feature.purchaseTrends()
        #expect(feature.hasTrendsAccess)
        #expect(feature.errorMessage == nil)

        let trackingStore = TrackingPurchaseStore()
        let relaunched = PurchasesFeature(store: trackingStore)
        let suiteName = "HabitTrackerPro.StoreKitLifecycle.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let habits = HabitsFeature(repository: InMemoryHabitsRepository())
        let model = AppModel(todayFeature: TodayFeature(habitsFeature: habits),
                             habitsFeature: habits,
                             dayStreakFeature: DayStreakFeature(habitsFeature: habits),
                             settingsFeature: SettingsFeature(defaults: defaults),
                             purchasesFeature: relaunched,
                             trendsFeature: TrendsFeature(habitsFeature: habits))
        defer { withExtendedLifetime(model) {} }
        model.applicationDidFinishLaunching()
        await relaunched.prepare()
        #expect(relaunched.hasTrendsAccess)
        let transaction = try #require(session.allTransactions().first)
        let finished = XCTestExpectation(description: "StoreKit revocation transaction handling finishes")
        trackingStore.onRevocationFinished = { finished.fulfill() }
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
        let finishOutcome = await XCTWaiter.fulfillment(of: [finished], timeout: 15)
        #expect(finishOutcome == .completed)
    }
}

// Preserve the real StoreKit behavior while observing completion of the
// entitlement refresh that handles a revocation.
@MainActor
private final class TrackingPurchaseStore: PurchaseStore {
    private let base = StoreKitManager()
    private var lastEntitlementWasRevoked = false
    var onRevocationFinished: (() -> Void)?

    func offer() async throws -> PurchaseOffer { try await base.offer() }
    func purchase() async throws -> PurchaseOutcome { try await base.purchase() }
    func hasTrendsAccess() async throws -> Bool {
        let access = try await base.hasTrendsAccess()
        lastEntitlementWasRevoked = !access
        return access
    }
    func restore() async throws { try await base.restore() }
    func updates() -> AsyncStream<Void> { base.updates() }
    func finishTransactions() async {
        let reportsRevocation = lastEntitlementWasRevoked
        await base.finishTransactions()
        if reportsRevocation {
            onRevocationFinished?()
            onRevocationFinished = nil
        }
    }
}
