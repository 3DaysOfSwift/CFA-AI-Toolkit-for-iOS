import Foundation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - Legacy implementation
// the serial queue protects the stored values and orders submitted saves.
// Completions run on that queue; real callers may depend on that detail.
// All access to savedWeights is confined to the queue, hence @unchecked Sendable.
final class LegacyWeightLog: @unchecked Sendable {
    private let queue = DispatchQueue(label: "example.weight-writes")
    private var savedWeights: [Int] = []

    func save(_ weight: Int, completion: @escaping @Sendable (Bool) -> Void) {
        queue.async {
            guard weight > 0 else {
                completion(false)
                return
            }
            self.savedWeights.append(weight)
            completion(true)
        }
    }

    func read(completion: @escaping @Sendable ([Int]) -> Void) {
        queue.async { completion(self.savedWeights) }
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let model = LegacyWeightLog()
    let results = AsyncStream<Bool>.makeStream()
    model.save(70) { results.continuation.yield($0) }
    model.save(-1) { results.continuation.yield($0) }
    model.save(72) { results.continuation.yield($0) }
    var iterator = results.stream.makeAsyncIterator()
    let first = await iterator.next()
    let invalid = await iterator.next()
    let last = await iterator.next()
    results.continuation.finish()
    precondition(first == true && invalid == false && last == true)
    let saved = await withCheckedContinuation { continuation in
        model.read { continuation.resume(returning: $0) }
    }
    precondition(saved == [70, 72])
    print("Passed: valid saves stayed ordered; the invalid value was rejected.")
}

// MARK: - Run before example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
