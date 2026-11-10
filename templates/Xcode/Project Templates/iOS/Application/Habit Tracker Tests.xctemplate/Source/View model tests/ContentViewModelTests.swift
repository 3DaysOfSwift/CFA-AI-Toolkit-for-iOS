import Testing

@testable import ___PROJECTNAME:identifier___

@Suite("Root navigation")
@MainActor
struct ContentViewModelTests {
    @Test("Starts on Today and retains the selected tab")
    func tabSelection() {
        let viewModel = ContentViewModel()

        #expect(viewModel.selectedTab == .today)

        viewModel.selectedTab = .settings

        #expect(viewModel.selectedTab == .settings)
    }
}
