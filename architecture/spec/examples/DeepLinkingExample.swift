// A small executable model-layer example, not a SwiftUI navigation implementation.
// Swift 6 language mode; macOS 14+ for Observation. The app provides a scene handler.
import Foundation
import Observation

struct DestinationRequest: Codable, Equatable, Sendable {
    let id: String
    let title: String
    let launchID: String
}

struct PendingSnapshot: Sendable {
    let revision: Int
    let requests: [DestinationRequest]
}

// The actor serializes file access. Only safe destination data is stored.
actor PendingRequestStore {
    private let fileURL: URL
    private var requests: [DestinationRequest] = []
    private var loaded = false
    private var revision = 0

    init(fileURL: URL) { self.fileURL = fileURL }

    func snapshot() throws -> PendingSnapshot {
        try loadIfNeeded()
        return PendingSnapshot(revision: revision, requests: requests)
    }

    func insert(_ request: DestinationRequest) throws -> PendingSnapshot {
        try loadIfNeeded()
        guard !requests.contains(where: { $0.id == request.id }) else { return try snapshot() }
        return try commit(requests + [request])
    }

    func remove(id: String) throws -> PendingSnapshot {
        try loadIfNeeded()
        return try commit(requests.filter { $0.id != id })
    }

    private func loadIfNeeded() throws {
        guard !loaded else { return }
        do {
            requests = try JSONDecoder().decode([DestinationRequest].self, from: Data(contentsOf: fileURL))
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            requests = []
        }
        loaded = true
    }

    private func commit(_ proposed: [DestinationRequest]) throws -> PendingSnapshot {
        let bytes = try JSONEncoder().encode(proposed)
        try bytes.write(to: fileURL, options: .atomic)
        requests = proposed
        revision += 1
        return PendingSnapshot(revision: revision, requests: requests)
    }
}

@MainActor @Observable
final class DeepLinkingFeature {
    private(set) var pending: [DestinationRequest] = []
    @ObservationIgnored private let store: PendingRequestStore
    @ObservationIgnored private var lastPublishedRevision = -1
    @ObservationIgnored private var opening: Set<String> = []

    init(store: PendingRequestStore) { self.store = store }

    func restore() async throws { publish(try await store.snapshot()) }

    func receive(_ request: DestinationRequest) async throws {
        publish(try await store.insert(request))
    }

    // Explicit dismissal removes the saved request as well as its visible entry.
    func dismiss(id: String) async throws {
        publish(try await store.remove(id: id))
    }

    // The scene checks cancellation and returns true only after navigation occurs.
    func open(id: String, inScene navigate: @MainActor (DestinationRequest) async -> Bool) async throws {
        guard !Task.isCancelled, !opening.contains(id), let request = pending.first(where: { $0.id == id }) else { return }
        opening.insert(id)
        defer { opening.remove(id) }
        guard await navigate(request) else { return }
        publish(try await store.remove(id: id))
    }

    private func publish(_ snapshot: PendingSnapshot) {
        guard snapshot.revision >= lastPublishedRevision else { return }
        lastPublishedRevision = snapshot.revision
        pending = snapshot.requests
    }
}

@main struct Example {
    enum ExampleFailure: Error { case expectedStorageError }
    @MainActor static func main() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let fileURL = folder.appendingPathComponent("pending.json")
        let request = DestinationRequest(id: "notification-1", title: "Next launch", launchID: "launch-42")

        let firstRun = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await firstRun.receive(request)
        try await firstRun.receive(request) // Repeated delivery does not add a duplicate.
        precondition(firstRun.pending == [request])
        try await firstRun.open(id: request.id) { _ in false } // User keeps editing.
        precondition(firstRun.pending == [request])

        // Two scenes cannot open the same pending request at the same time.
        var releaseNavigation: CheckedContinuation<Bool, Never>?
        let firstAttempt = Task { @MainActor in
            try await firstRun.open(id: request.id) { _ in
                await withCheckedContinuation { releaseNavigation = $0 }
            }
        }
        while releaseNavigation == nil { await Task.yield() }
        var secondSceneOpened = false
        try await firstRun.open(id: request.id) { _ in
            secondSceneOpened = true
            return true
        }
        precondition(!secondSceneOpened && firstRun.pending == [request])
        releaseNavigation?.resume(returning: false)
        try await firstAttempt.value
        precondition(firstRun.pending == [request])

        // After one scene declines, another scene can open the same request.
        var secondSceneDestination: DestinationRequest?
        try await firstRun.open(id: request.id) { destination in
            secondSceneDestination = destination
            return true
        }
        precondition(secondSceneDestination == request && firstRun.pending.isEmpty)
        try await firstRun.receive(request) // Continue the remaining scenarios with a pending request.

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
        try await nextRun.open(id: request.id) { destination in
            precondition(destination.launchID == "launch-42")
            return true // The scene opened the page.
        }
        precondition(nextRun.pending.isEmpty)
        let lastRun = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await lastRun.restore()
        precondition(lastRun.pending.isEmpty)
        let dismissed = DestinationRequest(id: "notification-2", title: "Another launch", launchID: "launch-43")
        try await lastRun.receive(dismissed)
        try await lastRun.dismiss(id: dismissed.id)
        let afterDismissal = DeepLinkingFeature(store: PendingRequestStore(fileURL: fileURL))
        try await afterDismissal.restore()
        precondition(afterDismissal.pending.isEmpty)

        let badURL = folder.appendingPathComponent("missing-directory/pending.json")
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
