import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
// This stand-in has no shared state. A real provider performs its own I/O.
struct LaunchProvider: Sendable {
    enum Failure: Error { case unavailable }
    func download(available: Bool) async throws -> String {
        guard available else { throw Failure.unavailable }
        return "Artemis"
    }
}

// AFTER: the Feature owns observable state and awaits the provider's result.
@MainActor @Observable
final class LaunchFeature {
    @ObservationIgnored private let provider: LaunchProvider
    @ObservationIgnored private var refreshTask: Task<Bool, Never>?
    @ObservationIgnored private var refreshID: UUID?
    private(set) var name = "No launch loaded"
    private(set) var errorMessage: String?
    init(provider: LaunchProvider) { self.provider = provider }

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
                errorMessage = nil
                return true
            } catch {
                errorMessage = "The launch could not be loaded."
                return false
            }
        }
        refreshTask = task
        refreshID = id
        return await task.value
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let feature = LaunchFeature(provider: LaunchProvider())
    let loaded = await feature.refresh(available: true)
    precondition(loaded && feature.name == "Artemis")
    let failedRefreshSucceeded = await feature.refresh(available: false)
    precondition(!failedRefreshSucceeded && feature.name == "Artemis" && feature.errorMessage != nil)
    let retried = await feature.refresh(available: true)
    precondition(retried && feature.name == "Artemis" && feature.errorMessage == nil)
    print("Passed: MainActor publication, failure retention and retry.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
