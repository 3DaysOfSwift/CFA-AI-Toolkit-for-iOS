import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Root navigation") @MainActor
struct RootTabViewModelTests {
    @Test func startsOnRepositories() {
        let model = RootTabViewModel()
        #expect(model.selectedTab == .gitRepos)
        model.selectedTab = .settings
        #expect(model.selectedTab == .settings)
    }
}
