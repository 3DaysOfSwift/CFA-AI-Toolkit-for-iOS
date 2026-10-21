import Foundation

actor NetworkingManager {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(from url: URL) async throws -> Data {
        let (data, response) = try await session.data(from: url)
        guard let response = response as? HTTPURLResponse,
              200..<300 ~= response.statusCode else {
            throw URLError(.badServerResponse)
        }
        return data
    }
}
