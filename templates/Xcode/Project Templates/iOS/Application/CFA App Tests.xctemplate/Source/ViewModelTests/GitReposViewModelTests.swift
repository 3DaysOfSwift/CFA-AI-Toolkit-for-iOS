import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("Git repositories screen") @MainActor
struct GitReposViewModelTests {
    @Test func missingDescriptionGetsPresentationFallback() throws {
        let feature = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let model = GitReposViewModel(gitReposFeature: feature)
        let url = try #require(URL(string: "https://example.org/repo"))
        let repo = Repo(id: 1, fullName: "Example/Repo", repositoryURL: url,
                        summary: nil, stars: 0, updatedAt: .now)
        #expect(model.summary(for: repo) == "No repository description.")
    }
    @Test func refreshFinishesAndExposesFeatureState() async {
        let feature = GitReposFeature(provider: TestGitReposProvider(), cache: TestRepoCache())
        let model = GitReposViewModel(gitReposFeature: feature)
        await model.refresh().value
        #expect(model.repos.isEmpty)
        #expect(!model.isRefreshing)
        #expect(model.refreshFailureMessage == nil)
    }

    @Test func refreshFailureHasReadableMessage() async {
        let feature = GitReposFeature(provider: FailingGitReposProvider(), cache: TestRepoCache())
        let model = GitReposViewModel(gitReposFeature: feature)
        await model.refresh().value
        #expect(model.refreshFailureMessage == "Could not refresh GitHub repositories. Please try again.")
    }
}
