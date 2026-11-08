import Foundation
nonisolated struct Repo: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let fullName: String
    let repositoryURL: URL
    let summary: String?
    let stars: Int
    let updatedAt: Date

    init(id: Int, fullName: String, repositoryURL: URL, summary: String?, stars: Int, updatedAt: Date) {
        self.id = id
        self.fullName = fullName
        self.repositoryURL = repositoryURL
        self.summary = summary
        self.stars = stars
        self.updatedAt = updatedAt
    }

    init(response: GitHubRepoResponse) {
        self.init(
            id: response.id,
            fullName: response.fullName,
            repositoryURL: response.repositoryURL,
            summary: response.description,
            stars: response.stars,
            updatedAt: response.updatedAt
        )
    }

}
