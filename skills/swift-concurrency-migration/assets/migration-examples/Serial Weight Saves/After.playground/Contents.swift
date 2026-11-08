import Foundation
import Observation
import PlaygroundSupport

PlaygroundPage.current.needsIndefiniteExecution = true

// MARK: - CFA implementation
// storage owns the saved data; the Feature owns the observable snapshot.
// This actor represents the storage boundary, not a database implementation.
actor WeightStorage {
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
    @ObservationIgnored private let storage: WeightStorage
    @ObservationIgnored private var lastSave: Task<Bool, Never>?
    @ObservationIgnored private var lastSaveID: UUID?
    private(set) var weights: [Int] = []
    private(set) var saveError: String?

    init(storage: WeightStorage) { self.storage = storage }

    // Each distinct save waits for the previous save, including a failed save.
    @discardableResult
    func save(_ weight: Int) -> Task<Bool, Never> {
        let previous = lastSave
        let id = UUID()
        let task = Task {
            defer {
                if lastSaveID == id { lastSave = nil; lastSaveID = nil }
            }
            _ = await previous?.value
            do {
                try await storage.save(weight)
                weights.append(weight) // Publish only after storage succeeds.
                saveError = nil
                return true
            } catch {
                saveError = "Weight could not be saved."
                return false
            }
        }
        lastSave = task
        lastSaveID = id
        return task
    }
}

// MARK: - Test fixtures
// MARK: - Behaviour check
@MainActor
func runExample() async {
    let storage = WeightStorage()
    let feature = WeightLogFeature(storage: storage)
    let first = feature.save(70)
    let invalid = feature.save(-1)
    let firstSaved = await first.value
    let invalidSaved = await invalid.value
    precondition(firstSaved && !invalidSaved && feature.weights == [70])
    precondition(feature.saveError != nil)
    let finalSaved = await feature.save(72).value
    let stored = await storage.read()
    precondition(finalSaved && feature.weights == [70, 72] && stored == feature.weights)
    precondition(feature.saveError == nil)

    // Submit all three before awaiting, including a failed middle operation.
    let queuedStorage = WeightStorage()
    let queuedFeature = WeightLogFeature(storage: queuedStorage)
    let firstQueued = queuedFeature.save(80)
    let rejectedQueued = queuedFeature.save(-1)
    let lastQueued = queuedFeature.save(82)
    let firstResult = await firstQueued.value
    let rejectedResult = await rejectedQueued.value
    let lastResult = await lastQueued.value
    let queuedStored = await queuedStorage.read()
    precondition(firstResult && !rejectedResult && lastResult)
    precondition(queuedFeature.weights == [80, 82] && queuedStored == [80, 82])
    print("Passed: valid saves stayed ordered; the invalid value was rejected.")
}

// MARK: - Run after example
Task { @MainActor in
    await runExample()
    PlaygroundPage.current.finishExecution()
}
