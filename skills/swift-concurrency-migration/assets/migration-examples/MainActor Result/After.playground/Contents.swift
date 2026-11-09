import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
protocol LaunchProviding: Sendable {
    func download(available: Bool) async throws -> String
}

// AFTER: the Feature owns observable state and awaits the provider's result.
@MainActor @Observable
final class LaunchFeature {
    enum RefreshFailure { case providerFailed }

    @ObservationIgnored private let provider: any LaunchProviding
    private var refreshTask: Task<Bool, Never>?
    @ObservationIgnored private var refreshID: UUID?
    private(set) var name = "No launch loaded"
    private(set) var refreshFailure: RefreshFailure?
    var isRefreshing: Bool { refreshTask != nil }
    init(provider: any LaunchProviding) { self.provider = provider }

    // The fixture publishes every simulated outcome in admission order.
    func refresh(available: Bool) async -> Bool {
        let previous = refreshTask
        let id = UUID()
        let task = Task {
            defer {
                if refreshID == id {
                    refreshTask = nil
                    refreshID = nil
                }
            }
            _ = await previous?.value
            do {
                let downloadedName = try await provider.download(available: available)
                name = downloadedName
                refreshFailure = nil
                return true
            } catch {
                refreshFailure = .providerFailed
                return false
            }
        }
        refreshTask = task
        refreshID = id
        return await task.value
    }
}

// MARK: - Test fixtures
// This stand-in has no shared state. A real provider performs its own I/O.
struct FixtureLaunchProvider: LaunchProviding {
    enum Failure: Error { case unavailable }
    func download(available: Bool) async throws -> String {
        guard available else { throw Failure.unavailable }
        return "Artemis"
    }
}

// MARK: - Behaviour check
@MainActor
func runExample() async {
    let feature = LaunchFeature(provider: FixtureLaunchProvider())
    let loaded = await feature.refresh(available: true)
    precondition(loaded && feature.name == "Artemis")
    let failedRefreshSucceeded = await feature.refresh(available: false)
    precondition(!failedRefreshSucceeded && !feature.isRefreshing)
    precondition(feature.name == "Artemis" && feature.refreshFailure == .providerFailed)
    let retried = await feature.refresh(available: true)
    precondition(retried && feature.name == "Artemis" && feature.refreshFailure == nil)
    print("Passed: MainActor publication, failure retention and retry.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
