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
    private(set) var name: String?
    private(set) var refreshFailure: RefreshFailure?
    var isRefreshing: Bool { refreshTask != nil }
    init(provider: any LaunchProviding) { self.provider = provider }

    // The legacy callback accepts every call. Keep that policy even if the
    // caller is already cancelled, and publish each outcome in admission order.
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
    let launchFeature = LaunchFeature(provider: FixtureLaunchProvider())
    precondition(launchFeature.name == nil && !launchFeature.isRefreshing && launchFeature.refreshFailure == nil)
    let loaded = await launchFeature.refresh(available: true)
    precondition(loaded && launchFeature.name == "Artemis")
    let failedRefreshSucceeded = await launchFeature.refresh(available: false)
    precondition(!failedRefreshSucceeded && !launchFeature.isRefreshing)
    precondition(launchFeature.name == "Artemis" && launchFeature.refreshFailure == .providerFailed)
    let retried = await launchFeature.refresh(available: true)
    precondition(retried && launchFeature.name == "Artemis" && launchFeature.refreshFailure == nil)
    print("Passed: MainActor publication, failure retention and retry.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
