import Foundation

actor RepoFileCache: RepoCache {
    private let cacheFileURL: URL

    init(cacheDirectoryURL: URL) {
        cacheFileURL = cacheDirectoryURL.appending(path: "git-repositories.json")
    }

    func loadRepos() throws -> [Repo] {
        guard FileManager.default.fileExists(atPath: cacheFileURL.path()) else {
            return []
        }

        let data = try Data(contentsOf: cacheFileURL)
        return try JSONDecoder().decode([Repo].self, from: data)
    }

    func saveRepos(_ repos: [Repo]) throws {
        let data = try JSONEncoder().encode(repos)
        try FileManager.default.createDirectory(at: cacheFileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: cacheFileURL, options: .atomic)
    }
}
