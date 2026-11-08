import Foundation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - Legacy implementation
// the caller handles the result in a callback; URLSession owns the task.
struct LegacyLaunchAPI: Sendable {
    let session: URLSession
    func download(from url: URL, completion: @escaping @Sendable (Result<Launch, any Error>) -> Void) {
        session.dataTask(with: url) { data, response, error in
            do {
                if let error { throw error }
                guard let response = response as? HTTPURLResponse, let data else { throw DownloadError.invalidResponse }
                guard response.statusCode == 200 else { throw DownloadError.httpStatus(response.statusCode) }
                completion(.success(try JSONDecoder().decode(Launch.self, from: data)))
            } catch { completion(.failure(error)) }
        }.resume()
    }
}

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

struct Launch: Decodable, Equatable, Sendable { let name: String }
enum DownloadError: Error, Equatable { case invalidResponse; case httpStatus(Int) }

// MARK: - Behaviour check
func runExample() async throws {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [FixtureURLProtocol.self]
    let session = URLSession(configuration: configuration)
    defer { session.invalidateAndCancel() }
    guard let success = URL(string: "https://example.invalid/launch"),
          let failure = URL(string: "https://example.invalid/failure") else { throw URLError(.badURL) }
    let api = LegacyLaunchAPI(session: session)
    let launch = try await withCheckedThrowingContinuation { continuation in
        api.download(from: success) { continuation.resume(with: $0) }
    }
    precondition(launch.name == "Artemis")
    do {
        let _: Launch = try await withCheckedThrowingContinuation { continuation in
            api.download(from: failure) { continuation.resume(with: $0) }
        }
        preconditionFailure("HTTP failure must not be reported as success")
    } catch DownloadError.httpStatus(503) {}
    print("Passed: Artemis downloaded; HTTP 503 reported.")
}

// MARK: - Run before example
Task { @MainActor in
    do { try await runExample() } catch { print("Example failed: \(error)") }
    PlaygroundPage.current.finishExecution()
}
