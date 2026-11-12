import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

// This test protocol is retained by URLSession; its mutable coordination lives in an actor.
private final class OverlapURLProtocol: URLProtocol, @unchecked Sendable {
    private static let gate = RequestGate()

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Task {
            await Self.gate.waitForBothRequests()
            guard let url = request.url,
                  let response = HTTPURLResponse(url: url, statusCode: url.path == "/failure" ? 500 : 200,
                                                 httpVersion: nil, headerFields: nil) else {
                client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
                return
            }
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            let payload = url.path.hasPrefix("/orgs/")
                ? Data(#"[{"id":1,"full_name":"Example/Repo","html_url":"https://example.test/repo","description":null,"stargazers_count":3,"updated_at":"2026-01-01T00:00:00Z"}]"#.utf8)
                : Data(url.path.utf8)
            client?.urlProtocol(self, didLoad: payload)
            client?.urlProtocolDidFinishLoading(self)
        }
    }

    override func stopLoading() {}
}

private actor RequestGate {
    private var first: CheckedContinuation<Void, Never>?

    func waitForBothRequests() async {
        if let first {
            self.first = nil
            first.resume()
            return
        }
        await withCheckedContinuation { first = $0 }
    }
}

@Suite("Networking", .serialized, .timeLimit(.minutes(1)))
struct NetworkingManagerTests {
    @Test func providerActorCanStartAnotherRequestWhileFirstIsSuspended() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [OverlapURLProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let gitHubAPI = await GitHubAPI(networkingManager: NetworkingManager(session: session))

        // The fixture releases neither response until both calls reach it.
        async let first = gitHubAPI.fetchRepos()
        async let second = gitHubAPI.fetchRepos()
        let (firstRepos, secondRepos) = try await (first, second)
        #expect(firstRepos.map(\.id) == [1])
        #expect(secondRepos.map(\.id) == [1])
    }

    @Test func independentRequestsCanOverlap() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [OverlapURLProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let networkingManager = NetworkingManager(session: session)
        let firstURL = try #require(URL(string: "https://example.test/first"))
        let secondURL = try #require(URL(string: "https://example.test/second"))

        // Neither response is released until both requests have reached the protocol.
        async let first = networkingManager.data(from: firstURL)
        async let second = networkingManager.data(from: secondURL)
        let (firstData, secondData) = try await (first, second)
        #expect(String(data: firstData, encoding: .utf8) == "/first")
        #expect(String(data: secondData, encoding: .utf8) == "/second")
    }

    @Test func unsuccessfulHTTPResponseThrows() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [OverlapURLProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let networkingManager = NetworkingManager(session: session)
        let goodURL = try #require(URL(string: "https://example.test/good"))
        let failureURL = try #require(URL(string: "https://example.test/failure"))
        async let good = networkingManager.data(from: goodURL)
        async let failure = networkingManager.data(from: failureURL)
        #expect(try await String(data: good, encoding: .utf8) == "/good")
        do {
            _ = try await failure
            Issue.record("A non-success HTTP response must throw")
        } catch let error as URLError {
            #expect(error.code == .badServerResponse)
        }
    }
}
