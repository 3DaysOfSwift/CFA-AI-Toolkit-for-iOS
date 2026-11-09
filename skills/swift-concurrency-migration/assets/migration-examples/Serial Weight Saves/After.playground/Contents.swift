import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
protocol WeightSaving: Sendable {
    func save(_ weight: Int) async throws
}

// Storage owns the saved data; the Feature owns the observable snapshot.
// This actor represents the storage boundary, not a database implementation.
actor WeightStorage: WeightSaving {
    enum SaveError: Error { case invalidWeight }
    private var savedWeights: [Int] = []

    func save(_ weight: Int) throws {
        guard weight > 0 else { throw SaveError.invalidWeight }
        savedWeights.append(weight)
    }

    func read() -> [Int] { savedWeights }
}

@MainActor @Observable
final class WeightLogFeature {
    enum SaveFailure { case storageRejectedWrite }

    @ObservationIgnored private let storage: any WeightSaving
    @ObservationIgnored private var lastSave: Task<Bool, Never>?
    @ObservationIgnored private var lastSaveID: UUID?
    private(set) var weights: [Int] = []
    private(set) var saveFailure: SaveFailure?

    init(storage: any WeightSaving) { self.storage = storage }

    // Each save waits for the previous save, including a failed save.
    @discardableResult
    func save(_ weight: Int) async -> Bool {
        let previous = lastSave
        let id = UUID()
        let task = Task {
            defer {
                if lastSaveID == id {
                    lastSave = nil
                    lastSaveID = nil
                }
            }
            _ = await previous?.value
            do {
                try await storage.save(weight)
                weights.append(weight) // Publish only after storage succeeds.
                saveFailure = nil
                return true
            } catch {
                saveFailure = .storageRejectedWrite
                return false
            }
        }
        lastSave = task
        lastSaveID = id
        return await task.value
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let storage = WeightStorage()
    let feature = WeightLogFeature(storage: storage)
    let firstSaved = await feature.save(70)
    let invalidSaved = await feature.save(-1)
    precondition(firstSaved && !invalidSaved && feature.weights == [70])
    precondition(feature.saveFailure == .storageRejectedWrite)
    let finalSaved = await feature.save(72)
    let stored = await storage.read()
    precondition(finalSaved && feature.weights == [70, 72] && stored == feature.weights)
    precondition(feature.saveFailure == nil)

    // Run three callers as child tasks. The Feature controls the save order
    // after admission, and this example waits for every outcome.
    let queuedStorage = WeightStorage()
    let queuedFeature = WeightLogFeature(storage: queuedStorage)
    async let firstQueued = queuedFeature.save(80)
    async let rejectedQueued = queuedFeature.save(-1)
    async let lastQueued = queuedFeature.save(82)
    let (firstResult, rejectedResult, lastResult) = await (firstQueued, rejectedQueued, lastQueued)
    let queuedStored = await queuedStorage.read()
    precondition(firstResult && !rejectedResult && lastResult)
    // Scheduling can change the admission order. Both valid saves must persist.
    precondition(queuedFeature.weights.sorted() == [80, 82] && queuedStored == queuedFeature.weights)
    print("Passed: valid saves were retained; the invalid value was rejected.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
