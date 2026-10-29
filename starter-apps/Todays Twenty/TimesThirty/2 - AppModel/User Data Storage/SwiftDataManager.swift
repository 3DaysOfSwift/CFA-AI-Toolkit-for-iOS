import Foundation
import SwiftData

@Model
final class StoredSession {
    @Attribute(.unique) var id: UUID
    var payload: Data

    init(id: UUID, payload: Data) {
        self.id = id
        self.payload = payload
    }
}

@ModelActor
actor SessionStore {
    func fetchSessions() throws -> [PracticeSession] {
        try modelContext.fetch(FetchDescriptor<StoredSession>()).map {
            try JSONDecoder().decode(PracticeSession.self, from: $0.payload)
        }
    }

    func save(_ session: PracticeSession) throws {
        let identifier = session.id
        let descriptor = FetchDescriptor<StoredSession>(predicate: #Predicate { $0.id == identifier })
        let payload = try JSONEncoder().encode(session)
        do {
            if let record = try modelContext.fetch(descriptor).first {
                record.payload = payload
            } else {
                modelContext.insert(StoredSession(id: identifier, payload: payload))
            }
            try modelContext.save()
        } catch {
            modelContext.rollback()
            throw error
        }
    }
}

actor SwiftDataManager: SessionRepository {
    private let storeURL: URL
    private var sessionStore: SessionStore?

    init(storeURL: URL) {
        self.storeURL = storeURL
    }

    private func store() throws -> SessionStore {
        if let sessionStore { return sessionStore }
        try FileManager.default.createDirectory(at: storeURL.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        let configuration = ModelConfiguration(url: storeURL)
        let container = try ModelContainer(for: StoredSession.self, configurations: configuration)
        let store = SessionStore(modelContainer: container)
        sessionStore = store
        return store
    }

    func fetchSessions() async throws -> [PracticeSession] {
        try await store().fetchSessions()
    }

    func save(_ session: PracticeSession) async throws {
        try await store().save(session)
    }
}
