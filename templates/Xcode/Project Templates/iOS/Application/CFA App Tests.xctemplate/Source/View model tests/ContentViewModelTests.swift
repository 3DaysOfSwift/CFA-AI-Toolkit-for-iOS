import Testing
@testable import ___PACKAGENAME:identifier___

@MainActor
struct ContentViewModelTests {
    @Test func presentsFirstFeatureGuidance() {
        #expect(ContentViewModel().message.contains("feature"))
    }
}
