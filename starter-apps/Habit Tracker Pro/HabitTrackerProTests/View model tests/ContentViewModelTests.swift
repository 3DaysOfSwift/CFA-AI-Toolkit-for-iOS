import Testing

@testable import HabitTrackerPro

@Suite("Root screen")
@MainActor
struct ContentViewModelTests {
    @Test("Tab selection is presentation state")
    func selectsTab() {
        let viewModel = ContentViewModel()

        #expect(viewModel.selectedTab == .today)
        viewModel.selectedTab = .trends
        #expect(viewModel.selectedTab == .trends)
    }
}
