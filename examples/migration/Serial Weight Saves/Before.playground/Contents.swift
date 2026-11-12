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
    let legacyWeightLog = LegacyWeightLog()
    let saveResults = AsyncStream<Bool>.makeStream()
    legacyWeightLog.save(70) { saveResults.continuation.yield($0) }
    legacyWeightLog.save(-1) { saveResults.continuation.yield($0) }
    legacyWeightLog.save(72) { saveResults.continuation.yield($0) }
    var iterator = saveResults.stream.makeAsyncIterator()
    let first = await iterator.next()
    let invalid = await iterator.next()
    let last = await iterator.next()
    saveResults.continuation.finish()
    precondition(first == true && invalid == false && last == true)
    let saved = await withCheckedContinuation { continuation in
        legacyWeightLog.read { continuation.resume(returning: $0) }
    }
    precondition(saved == [70, 72])
    print("Passed: valid saves stayed ordered; the invalid value was rejected.")
}

// MARK: - Run before example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
