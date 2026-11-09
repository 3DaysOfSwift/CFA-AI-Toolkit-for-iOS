import Foundation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - Legacy implementation
// A callback receives a result and schedules a UI state update.
@MainActor
final class LegacyLaunchModel {
    private(set) var name = "No launch loaded"
    func load(completion: @escaping @MainActor @Sendable () -> Void) {
        DispatchQueue.global().async {
            let result = "Artemis"
            DispatchQueue.main.async {
                self.name = result
                completion()
            }
        }
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let model = LegacyLaunchModel()
    await withCheckedContinuation { continuation in
        model.load {
            precondition(model.name == "Artemis")
            continuation.resume()
        }
    }
    print("Passed: the result is published on MainActor.")
}

// MARK: - Run before example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
