import Foundation

actor GitHubAPI: GitReposProvider {
    private let networkingManager: NetworkingManager

    init(networkingManager: NetworkingManager) {
        self.networkingManager = networkingManager
    }

    func fetchRepos() async throws -> [GitHubRepoResponse] {
        try Task.checkCancellation()
        guard let url = URL(string: "https://api.github.com/orgs/3DaysOfSwift/repos?per_page=100&sort=updated") else {
            throw URLError(.badURL)
        }
        let data = try await networkingManager.data(from: url)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([GitHubRepoResponse].self, from: data)
    }
}

nonisolated struct GitHubRepoResponse: Decodable, Sendable {
    let id: Int
    let fullName: String
    let repositoryURL: URL
    let description: String?
    let stars: Int
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case repositoryURL = "html_url"
        case description
        case stars = "stargazers_count"
        case updatedAt = "updated_at"
    }
}
