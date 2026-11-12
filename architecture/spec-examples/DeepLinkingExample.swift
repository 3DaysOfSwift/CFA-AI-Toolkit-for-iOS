// A small executable model-layer example, not a SwiftUI navigation implementation.
// Swift 6 language mode; macOS 14+ for Observation. The app provides a scene handler.
import Foundation
import Observation

struct DestinationRequest: Codable, Equatable, Sendable {
    let id: String
    let title: String
    let launchID: String

    var isValid: Bool {
        !id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !launchID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

struct PendingSnapshot: Sendable {
    let revision: Int
    let requests: [DestinationRequest]
}

protocol PendingRequestRepository: Sendable {
    func snapshot() async throws -> PendingSnapshot
    func insert(_ request: DestinationRequest) async throws -> PendingSnapshot
    func remove(id: String) async throws -> PendingSnapshot
}

// The actor serializes file access. Only safe destination data is stored.
actor PendingRequestStore: PendingRequestRepository {
    private let fileURL: URL
    private var requests: [DestinationRequest] = []
    private var resolvedIDs: Set<String> = []
    private var loaded = false
    private var revision = 0

    init(fileURL: URL) { self.fileURL = fileURL }

    func snapshot() throws -> PendingSnapshot {
        try loadIfNeeded()
        return PendingSnapshot(revision: revision, requests: requests)
    }

    func insert(_ request: DestinationRequest) throws -> PendingSnapshot {
        guard request.isValid else { throw PendingRequestError.invalidDestination }
        try loadIfNeeded()
        guard !resolvedIDs.contains(request.id),
              !requests.contains(where: { $0.id == request.id }) else { return try snapshot() }
        return try commit(requests + [request])
    }

    func remove(id: String) throws -> PendingSnapshot {
        try Task.checkCancellation()
        try loadIfNeeded()
        let remainingRequests = requests.filter { $0.id != id }
        guard remainingRequests.count != requests.count else { return try snapshot() }
        let committedSnapshot = try commit(remainingRequests)
        resolvedIDs.insert(id) // Suppress repeated callbacks for this event in this store's lifetime.
        return committedSnapshot
    }

    private func loadIfNeeded() throws {
        guard !loaded else { return }
        do {
            let saved = try JSONDecoder().decode([DestinationRequest].self, from: Data(contentsOf: fileURL))
            guard saved.allSatisfy(\.isValid), Set(saved.map(\.id)).count == saved.count else {
                throw PendingRequestError.invalidSavedRequests
            }
            requests = saved
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            requests = []
        }
        loaded = true
    }

    private func commit(_ proposed: [DestinationRequest]) throws -> PendingSnapshot {
        let bytes = try JSONEncoder().encode(proposed)
        try FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true
        )
        try bytes.write(to: fileURL, options: .atomic)
        requests = proposed
        revision += 1
        return PendingSnapshot(revision: revision, requests: requests)
    }
}

enum PendingRequestError: Error {
    case invalidSavedRequests
    case invalidDestination
    case operationInProgress
}

@MainActor @Observable
final class DeepLinkingFeature {
    private(set) var pending: [DestinationRequest] = []
    @ObservationIgnored private let store: any PendingRequestRepository
    @ObservationIgnored private var lastPublishedRevision = -1
    @ObservationIgnored private var activeRequests: Set<String> = []
    @ObservationIgnored private var openedAwaitingRemoval: Set<String> = []

    init(store: any PendingRequestRepository) { self.store = store }

    func restore() async throws { publish(try await store.snapshot()) }

    func receive(_ request: DestinationRequest) async throws {
        guard request.isValid else {
            throw PendingRequestError.invalidDestination
        }
        publish(try await store.insert(request))
    }

    // Explicit dismissal removes the saved request as well as its visible entry.
    func dismiss(id: String) async throws {
        try Task.checkCancellation()
        guard activeRequests.insert(id).inserted else { throw PendingRequestError.operationInProgress }
        defer { activeRequests.remove(id) }
        try await removePending(id: id)
    }

    // The scene checks cancellation and returns true only after navigation occurs.
    func open(id: String, inScene navigate: @MainActor (DestinationRequest) async -> Bool) async throws {
        guard !Task.isCancelled, let request = pending.first(where: { $0.id == id }) else { return }
        guard activeRequests.insert(id).inserted else { throw PendingRequestError.operationInProgress }
        defer { activeRequests.remove(id) }
        if !openedAwaitingRemoval.contains(id) {
            guard await navigate(request) else { return }
            // If the write fails, retry cleanup without navigating again.
            // This marker lasts only for the current process.
            openedAwaitingRemoval.insert(id)
        }
        try await removePending(id: id)
    }

    private func removePending(id: String) async throws {
        // An admitted dismissal or completed navigation owns its durable
        // removal independently of the scene. The caller holds the reservation.
        let removal = Task {
            publish(try await store.remove(id: id))
            openedAwaitingRemoval.remove(id)
        }
        try await removal.value
    }

    private func publish(_ snapshot: PendingSnapshot) {
        guard snapshot.revision >= lastPublishedRevision else { return }
        lastPublishedRevision = snapshot.revision
        pending = snapshot.requests
    }
}

// Suspend a repository operation so the example can exercise an overlapping caller.
private actor GatedPendingRequestRepository: PendingRequestRepository {
    enum Gate { case snapshot, removal }

    private let store: PendingRequestStore
    private let gate: Gate
    private var release: CheckedContinuation<Void, Never>?

    init(store: PendingRequestStore, gate: Gate) {
        self.store = store
        self.gate = gate
    }

    func snapshot() async throws -> PendingSnapshot {
        let snapshot = try await store.snapshot()
        if gate == .snapshot { await withCheckedContinuation { release = $0 } }
        return snapshot
    }

    func insert(_ request: DestinationRequest) async throws -> PendingSnapshot {
        try await store.insert(request)
    }

    func remove(id: String) async throws -> PendingSnapshot {
        if gate == .removal { await withCheckedContinuation { release = $0 } }
        return try await store.remove(id: id)
    }

    func waitUntilHeld() async {
        while release == nil { await Task.yield() }
    }

    func resumeOperation() {
        release?.resume()
        release = nil
    }
}

@main struct Example {
    enum ExampleFailure: Error { case expectedStorageError }
    @MainActor static func main() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let fileURL = folder.appendingPathComponent("pending.json")
        let initialRequest = DestinationRequest(id: "notification-1", title: "Next launch", launchID: "launch-42")

        let store = PendingRequestStore(fileURL: fileURL)
        let firstRun = DeepLinkingFeature(store: store)
        try await firstRun.receive(initialRequest)
        do {
            try await firstRun.receive(DestinationRequest(id: "invalid", title: "Missing launch", launchID: " "))
            preconditionFailure("A request without a destination must be rejected")
        } catch PendingRequestError.invalidDestination {
            precondition(firstRun.pending == [initialRequest])
        }
        // The store also protects its file when called without the Feature.
        do {
            _ = try await store.insert(DestinationRequest(id: " ", title: "Missing event", launchID: "launch-42"))
            preconditionFailure("The store must reject an invalid event identifier")
        } catch PendingRequestError.invalidDestination {
            let snapshot = try await store.snapshot()
            precondition(snapshot.requests == [initialRequest])
        }
        let restoredAfterInvalidRequest = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await restoredAfterInvalidRequest.restore()
        precondition(restoredAfterInvalidRequest.pending == [initialRequest])

        try await firstRun.receive(initialRequest) // A repeated opening callback does not add a duplicate.
        precondition(firstRun.pending == [initialRequest])
        try await firstRun.open(id: initialRequest.id) { _ in false } // User keeps editing.
        precondition(firstRun.pending == [initialRequest])

        // Two scenes cannot open the same pending request at the same time.
        var releaseNavigation: CheckedContinuation<Bool, Never>?
        let firstAttempt = Task { @MainActor in
            try await firstRun.open(id: initialRequest.id) { _ in
                await withCheckedContinuation { releaseNavigation = $0 }
            }
        }
        while releaseNavigation == nil { await Task.yield() }
        var secondSceneOpened = false
        do {
            try await firstRun.open(id: initialRequest.id) { _ in
                secondSceneOpened = true
                return true
            }
            preconditionFailure("The second scene must receive a busy outcome")
        } catch PendingRequestError.operationInProgress {
            precondition(!secondSceneOpened && firstRun.pending == [initialRequest])
        }
        do {
            try await firstRun.dismiss(id: initialRequest.id)
            preconditionFailure("Dismissal must not race an active navigation")
        } catch PendingRequestError.operationInProgress {
            precondition(firstRun.pending == [initialRequest])
        }
        // A reservation applies to one request, so another scene can open
        // a different event while the first scene is still deciding.
        let independentRequest = DestinationRequest(
            id: "notification-independent", title: "Independent launch", launchID: "launch-44"
        )
        try await firstRun.receive(independentRequest)
        var independentDestination: DestinationRequest?
        try await firstRun.open(id: independentRequest.id) { destination in
            independentDestination = destination
            return true
        }
        precondition(independentDestination == independentRequest)
        precondition(firstRun.pending == [initialRequest])
        releaseNavigation?.resume(returning: false)
        try await firstAttempt.value
        precondition(firstRun.pending == [initialRequest])

        // After one scene declines, another scene can open the same request.
        var secondSceneDestination: DestinationRequest?
        try await firstRun.open(id: initialRequest.id) { destination in
            secondSceneDestination = destination
            return true
        }
        precondition(secondSceneDestination == initialRequest && firstRun.pending.isEmpty)
        try await firstRun.receive(initialRequest)
        precondition(firstRun.pending.isEmpty) // A repeated callback cannot reopen the completed event.

        // Opening a different item in one scene leaves the other scene's route intact.
        let anotherRequest = DestinationRequest(id: "notification-2", title: "Another launch", launchID: "launch-43")
        try await firstRun.receive(anotherRequest)
        var firstSceneDestination: DestinationRequest?
        try await firstRun.open(id: anotherRequest.id) { destination in
            firstSceneDestination = destination
            return true
        }
        precondition(firstSceneDestination == anotherRequest)
        precondition(secondSceneDestination == initialRequest && firstRun.pending.isEmpty)

        // A new opening event can target a destination that was already opened.
        let repeatedDestination = DestinationRequest(
            id: "notification-new-event", title: initialRequest.title, launchID: initialRequest.launchID
        )
        try await firstRun.receive(repeatedDestination)
        try await firstRun.receive(initialRequest)
        precondition(firstRun.pending == [repeatedDestination])
        try await firstRun.open(id: repeatedDestination.id) { destination in
            firstSceneDestination = destination
            return true
        }
        precondition(firstSceneDestination == repeatedDestination && firstRun.pending.isEmpty)
        precondition(secondSceneDestination == initialRequest)

        let request = DestinationRequest(id: "notification-deferred", title: "Next launch", launchID: "launch-42")
        try await firstRun.receive(request)

        // A cancelled scene attempt cannot consume the pending request.
        var finishCancelledNavigation: CheckedContinuation<Bool, Never>?
        let cancelledAttempt = Task { @MainActor in
            try await firstRun.open(id: request.id) { _ in
                let allowed = await withCheckedContinuation { finishCancelledNavigation = $0 }
                return allowed && !Task.isCancelled
            }
        }
        while finishCancelledNavigation == nil { await Task.yield() }
        cancelledAttempt.cancel()
        finishCancelledNavigation?.resume(returning: true)
        try await cancelledAttempt.value
        precondition(firstRun.pending == [request])

        // A cancellation arriving after navigation must not restore an opened item.
        let opened = DestinationRequest(id: "notification-opened", title: "Opened launch", launchID: "launch-44")
        try await firstRun.receive(opened)
        var finishOpenedNavigation: CheckedContinuation<Bool, Never>?
        let openedAttempt = Task { @MainActor in
            try await firstRun.open(id: opened.id) { _ in
                await withCheckedContinuation { finishOpenedNavigation = $0 }
            }
        }
        while finishOpenedNavigation == nil { await Task.yield() }
        openedAttempt.cancel()
        finishOpenedNavigation?.resume(returning: true) // The scene already navigated.
        try await openedAttempt.value
        precondition(firstRun.pending == [request])

        let nextRun = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await nextRun.restore()
        precondition(nextRun.pending == [request])
        var sceneIsAvailable = false
        var openedDestination: DestinationRequest?
        let navigate: @MainActor (DestinationRequest) async -> Bool = { destination in
            guard sceneIsAvailable else { return false }
            openedDestination = destination
            return true
        }
        try await nextRun.open(id: request.id, inScene: navigate)
        precondition(openedDestination == nil && nextRun.pending == [request])
        let restoredWhileUnavailable = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await restoredWhileUnavailable.restore()
        precondition(restoredWhileUnavailable.pending == [request])

        sceneIsAvailable = true
        try await nextRun.open(id: request.id, inScene: navigate)
        precondition(openedDestination == request)
        precondition(nextRun.pending.isEmpty)
        let dismissalStore = GatedPendingRequestRepository(store: PendingRequestStore(fileURL: fileURL), gate: .removal)
        let lastRun = DeepLinkingFeature(store: dismissalStore)
        try await lastRun.restore()
        precondition(lastRun.pending.isEmpty)
        let dismissed = DestinationRequest(id: "notification-dismissed", title: "Another launch", launchID: "launch-43")
        let retained = DestinationRequest(id: "notification-retained", title: "Another launch", launchID: "launch-43")
        // Distinct opening events for the same destination remain separate.
        try await lastRun.receive(dismissed)
        try await lastRun.receive(retained)
        precondition(lastRun.pending == [dismissed, retained])
        let cancelledDismissal = Task { @MainActor in
            try await lastRun.dismiss(id: dismissed.id)
        }
        cancelledDismissal.cancel()
        do {
            try await cancelledDismissal.value
            preconditionFailure("A cancelled caller must not admit a dismissal")
        } catch is CancellationError {
            precondition(lastRun.pending == [dismissed, retained])
        }
        let admittedDismissal = Task { @MainActor in
            try await lastRun.dismiss(id: dismissed.id)
        }
        await dismissalStore.waitUntilHeld()
        admittedDismissal.cancel()
        precondition(lastRun.pending == [dismissed, retained])
        await dismissalStore.resumeOperation()
        try await admittedDismissal.value
        precondition(lastRun.pending == [retained])
        try await lastRun.receive(dismissed)
        precondition(lastRun.pending == [retained], "A replay must not restore a dismissed event")
        let afterDismissal = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await afterDismissal.restore()
        precondition(afterDismissal.pending == [retained])

        // An opening callback can arrive before startup restores pending requests.
        let coldStart = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        let incoming = DestinationRequest(id: "notification-cold-start", title: "New launch", launchID: "launch-45")
        try await coldStart.receive(incoming)
        precondition(coldStart.pending == [retained, incoming])
        let restoredAfterIncoming = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await restoredAfterIncoming.restore()
        precondition(restoredAfterIncoming.pending == [retained, incoming])

        let delayedStore = GatedPendingRequestRepository(store: PendingRequestStore(fileURL: fileURL), gate: .snapshot)
        let restoring = DeepLinkingFeature(store: delayedStore)
        async let restoration: Void = restoring.restore()
        await delayedStore.waitUntilHeld()
        let duringRestore = DestinationRequest(id: "notification-during-restore", title: "New launch", launchID: "launch-46")
        try await restoring.receive(duringRestore)
        await delayedStore.resumeOperation()
        try await restoration
        precondition(restoring.pending == [retained, incoming, duringRestore])
        let restarted = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await restarted.restore()
        precondition(restarted.pending == restoring.pending)

        // A delayed restoration cannot put an opened request back on screen.
        async let restorationBeforeOpen: Void = restoring.restore()
        await delayedStore.waitUntilHeld()
        try await restoring.open(id: duringRestore.id) { _ in true }
        precondition(restoring.pending == [retained, incoming])
        await delayedStore.resumeOperation()
        try await restorationBeforeOpen
        precondition(restoring.pending == [retained, incoming])
        let restartedAfterOpen = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await restartedAfterOpen.restore()
        precondition(restartedAfterOpen.pending == restoring.pending)

        // Navigation can succeed while durable removal fails. Retry the write
        // in this process without asking another scene to navigate again.
        let retryFolder = folder.appendingPathComponent("removal-retry")
        let movedFolder = folder.appendingPathComponent("removal-paused")
        try FileManager.default.createDirectory(at: retryFolder, withIntermediateDirectories: false)
        let retryURL = retryFolder.appendingPathComponent("pending.json")
        let removalRetry = DeepLinkingFeature(store: PendingRequestStore(fileURL: retryURL))
        try await removalRetry.receive(request)
        try await removalRetry.receive(retained)
        try FileManager.default.moveItem(at: retryFolder, to: movedFolder)
        try Data().write(to: retryFolder) // A file blocks recreation of the directory.
        // A failed insertion leaves the last confirmed list visible.
        do {
            try await removalRetry.receive(incoming)
            throw ExampleFailure.expectedStorageError
        } catch is ExampleFailure {
            throw ExampleFailure.expectedStorageError
        } catch {
            precondition(removalRetry.pending == [request, retained])
        }
        do {
            try await removalRetry.open(id: request.id) { _ in true }
            throw ExampleFailure.expectedStorageError
        } catch is ExampleFailure {
            throw ExampleFailure.expectedStorageError
        } catch {
            precondition(removalRetry.pending == [request, retained])
        }
        do {
            try await removalRetry.dismiss(id: retained.id)
            throw ExampleFailure.expectedStorageError
        } catch is ExampleFailure {
            throw ExampleFailure.expectedStorageError
        } catch {
            precondition(removalRetry.pending == [request, retained])
        }
        try FileManager.default.removeItem(at: retryFolder)
        try FileManager.default.moveItem(at: movedFolder, to: retryFolder)
        let restoredAfterFailure = DeepLinkingFeature(store: PendingRequestStore(fileURL: retryURL))
        try await restoredAfterFailure.restore()
        precondition(restoredAfterFailure.pending == [request, retained])
        try await removalRetry.open(id: request.id) { _ in
            preconditionFailure("Retrying removal must not navigate again")
        }
        precondition(removalRetry.pending == [retained])
        let restoredAfterRetry = DeepLinkingFeature(store: PendingRequestStore(fileURL: retryURL))
        try await restoredAfterRetry.restore()
        precondition(restoredAfterRetry.pending == [retained])
        try await removalRetry.dismiss(id: retained.id)
        precondition(removalRetry.pending.isEmpty)
        let restoredAfterDismissalRetry = DeepLinkingFeature(store: PendingRequestStore(fileURL: retryURL))
        try await restoredAfterDismissalRetry.restore()
        precondition(restoredAfterDismissalRetry.pending.isEmpty)

        // Decodable data can still violate the pending list's identity rules.
        let invalidURL = folder.appendingPathComponent("invalid-pending.json")
        let invalidRequest = DestinationRequest(id: "invalid", title: "Missing launch", launchID: " ")
        for invalidList in [[request, request], [invalidRequest]] {
            let bytes = try JSONEncoder().encode(invalidList)
            try bytes.write(to: invalidURL)
            let invalidStore = DeepLinkingFeature(store: PendingRequestStore(fileURL: invalidURL))
            do {
                try await invalidStore.receive(incoming)
                preconditionFailure("An invalid saved list must be rejected before writing")
            } catch PendingRequestError.invalidSavedRequests {
                let preserved = try Data(contentsOf: invalidURL)
                precondition(invalidStore.pending.isEmpty && preserved == bytes)
            }
        }

        // A corrupt durable list must not be mistaken for an empty one.
        let corruptURL = folder.appendingPathComponent("corrupt-pending.json")
        let corruptBytes = Data("{".utf8)
        try corruptBytes.write(to: corruptURL)
        let recovering = DeepLinkingFeature(store: PendingRequestStore(fileURL: corruptURL))
        do {
            try await recovering.receive(request)
            throw ExampleFailure.expectedStorageError
        } catch DecodingError.dataCorrupted {
            let savedBytes = try Data(contentsOf: corruptURL)
            precondition(recovering.pending.isEmpty && savedBytes == corruptBytes)
        }
        let recoveredBytes = try JSONEncoder().encode([retained])
        try recoveredBytes.write(to: corruptURL, options: .atomic)
        try await recovering.receive(request)
        precondition(recovering.pending == [retained, request])
        let recoveredRun = DeepLinkingFeature(store: PendingRequestStore(fileURL: corruptURL))
        try await recoveredRun.restore()
        precondition(recoveredRun.pending == [retained, request])

        let blockedDirectory = folder.appendingPathComponent("blocked-directory")
        try Data().write(to: blockedDirectory)
        let badURL = blockedDirectory.appendingPathComponent("pending.json")
        let unavailable = DeepLinkingFeature(store: PendingRequestStore(fileURL: badURL))
        do {
            try await unavailable.receive(request)
            throw ExampleFailure.expectedStorageError
        } catch is ExampleFailure {
            throw ExampleFailure.expectedStorageError
        } catch {
            precondition(unavailable.pending.isEmpty) // A failed write was not claimed as saved.
        }
        print("Passed: a deferred destination survives restart and is removed after navigation.")
    }
}
