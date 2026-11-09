import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
// Real providers perform their own I/O.
actor LaunchProvider {
    enum Failure: Error { case unavailable }
    func download(available: Bool) throws -> String {
        guard available else { throw Failure.unavailable }
        return "Artemis"
    }
}

// AFTER: the Feature owns observable state and awaits the provider's result.
@MainActor @Observable
final class LaunchFeature {
    @ObservationIgnored private let provider: LaunchProvider
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private var refreshID: UUID?
    private(set) var name = "No launch loaded"
    private(set) var errorMessage: String?
    init(provider: LaunchProvider) { self.provider = provider }

    // Requests may have different inputs, so each is processed in order.
    func refresh(available: Bool) async {
        let previous = refreshTask
        let id = UUID()
        let task = Task { @MainActor in
            await previous?.value
            do {
                let downloadedName = try await provider.download(available: available)
                name = downloadedName
                errorMessage = nil
            } catch {
                errorMessage = "The launch could not be loaded."
            }
        }
        refreshTask = task
        refreshID = id
        await task.value
        if refreshID == id {
            refreshTask = nil
            refreshID = nil
        }
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let feature = LaunchFeature(provider: LaunchProvider())
    await feature.refresh(available: true)
    precondition(feature.name == "Artemis")
    await feature.refresh(available: false)
    precondition(feature.name == "Artemis" && feature.errorMessage != nil)
    await feature.refresh(available: true)
    precondition(feature.name == "Artemis" && feature.errorMessage == nil)
    print("Passed: MainActor publication, failure retention and retry.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
