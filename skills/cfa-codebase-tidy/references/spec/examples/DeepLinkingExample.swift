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

    // A scene returns true after navigation occurs; it does not wait for data loading.
    func open(id: String, inScene navigate: @MainActor (DestinationRequest) async -> Bool) async throws {
        guard !opening.contains(id), let request = pending.first(where: { $0.id == id }) else { return }
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
