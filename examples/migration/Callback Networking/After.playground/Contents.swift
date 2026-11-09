import Foundation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
// NetworkingManager owns the shared transport boundary.
struct NetworkingManager: Sendable {
    private let session: URLSession
    init(session: URLSession) { self.session = session }

    func downloadData(from url: URL) async throws -> (Data, URLResponse) {
        try await session.data(from: url)
    }
}

// The provider checks and decodes its own response.
actor LaunchAPI {
    private let networkingManager: NetworkingManager
    init(networkingManager: NetworkingManager) { self.networkingManager = networkingManager }
    func download(from url: URL) async throws -> Launch {
        let (data, response) = try await networkingManager.downloadData(from: url)
        guard let response = response as? HTTPURLResponse else { throw DownloadError.invalidResponse }
        guard response.statusCode == 200 else { throw DownloadError.httpStatus(response.statusCode) }
        return try JSONDecoder().decode(Launch.self, from: data)
    }
}

struct Launch: Decodable, Equatable, Sendable { let name: String }
enum DownloadError: Error, Equatable { case invalidResponse; case httpStatus(Int) }

// MARK: - Test fixtures
// Deterministic network fixture; no real service is contacted.
// URLSession owns the protocol lifecycle; this subclass adds no mutable state.
// Reassess the unchecked conformance if the fixture gains shared state.
final class FixtureURLProtocol: URLProtocol, @unchecked Sendable {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let url = request.url,
              let response = HTTPURLResponse(url: url, statusCode: url.path == "/failure" ? 503 : 200,
                                             httpVersion: nil, headerFields: nil) else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(#"{"name":"Artemis"}"#.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

// MARK: - Behaviour check
func runExample() async throws {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [FixtureURLProtocol.self]
    let session = URLSession(configuration: configuration)
    defer { session.invalidateAndCancel() }
    guard let success = URL(string: "https://example.invalid/launch"),
          let failure = URL(string: "https://example.invalid/failure") else { throw URLError(.badURL) }
    let api = LaunchAPI(networkingManager: NetworkingManager(session: session))
    let launch = try await api.download(from: success)
    precondition(launch.name == "Artemis")
    do {
        _ = try await api.download(from: failure)
        preconditionFailure("HTTP failure must not be reported as success")
    } catch DownloadError.httpStatus(503) {}
    print("Passed: Artemis downloaded; HTTP 503 reported.")
}

// MARK: - Run after example
Task { @MainActor in
    do { try await runExample() } catch { print("Example failed: \(error)") }
    PlaygroundPage.current.finishExecution()
}
