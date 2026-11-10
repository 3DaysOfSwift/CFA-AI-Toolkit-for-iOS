import Testing

@testable import TimesThirty

@Suite("Root navigation")
@MainActor
struct ContentViewModelTests {
    @Test("Starts on Practice and retains the selected tab")
    func tabSelection() {
        let viewModel = ContentViewModel()

        #expect(viewModel.selectedTab == .practice)

        viewModel.selectedTab = .settings

        #expect(viewModel.selectedTab == .settings)
    }
}
