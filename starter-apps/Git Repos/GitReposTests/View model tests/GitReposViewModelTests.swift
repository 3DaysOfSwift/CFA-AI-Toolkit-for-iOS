import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Git repositories screen") @MainActor
struct GitReposViewModelTests {
    @Test func missingDescriptionGetsPresentationFallback() throws {
        let gitReposFeature = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let viewModel = GitReposViewModel(gitReposFeature: gitReposFeature)
        let repositoryURL = try #require(URL(string: "https://example.org/repo"))
        let repository = Repo(id: 1, fullName: "Example/Repo", repositoryURL: repositoryURL,
                              summary: nil, stars: 0, updatedAt: .now)
        #expect(viewModel.summary(for: repository) == "No repository description.")
    }
    @Test func refreshFinishesAndExposesFeatureState() async {
        let gitReposFeature = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let viewModel = GitReposViewModel(gitReposFeature: gitReposFeature)
        await viewModel.refresh().value
        #expect(viewModel.repos.isEmpty)
        #expect(!viewModel.isRefreshing)
        #expect(viewModel.refreshFailureMessage == nil)
    }

    @Test func refreshFailureHasReadableMessage() async {
        let gitReposFeature = GitReposFeature(provider: FailingGitReposProvider(), cache: TestRepoCache())
        let viewModel = GitReposViewModel(gitReposFeature: gitReposFeature)
        await viewModel.refresh().value
        #expect(viewModel.refreshFailureMessage == "Could not refresh GitHub repositories. Please try again.")
    }
}
