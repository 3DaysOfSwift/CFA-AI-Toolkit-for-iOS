import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Root navigation") @MainActor
struct RootTabViewModelTests {
    @Test func startsOnRepositories() {
        let viewModel = RootTabViewModel()
        #expect(viewModel.selectedTab == .gitRepos)
        viewModel.selectedTab = .settings
        #expect(viewModel.selectedTab == .settings)
    }
}
