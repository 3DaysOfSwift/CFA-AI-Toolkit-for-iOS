import Testing
@testable import ___PACKAGENAME:identifier___

@MainActor
struct AppModelTests {
    @Test func suppliesGuidanceWithoutProductFeatures() {
        #expect(!AppModel.shared.firstFeatureGuidance.isEmpty)
    }
}
