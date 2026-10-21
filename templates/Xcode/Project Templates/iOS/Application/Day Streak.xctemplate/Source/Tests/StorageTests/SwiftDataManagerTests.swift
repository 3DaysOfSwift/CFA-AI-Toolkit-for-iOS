import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

struct SwiftDataManagerTests {
    @Test func createsDirectoryAndReopensDurableSession() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: "___PACKAGENAMEASIDENTIFIER___Tests-\(UUID())")
        let url = directory.appending(path: "Nested/Sessions.store")
        defer { try? FileManager.default.removeItem(at: directory) }
        let first = SwiftDataManager(storeURL: url)
        let session = PracticeSession(id: UUID(), day: Date(), isExtraPractice: false, difficulty: .everyday,
                                      question: MultiplicationQuestion.random(difficulty: .everyday))
        try await first.save(session)
        let reopened = SwiftDataManager(storeURL: url)
        #expect(try await reopened.fetchSessions() == [session])
        var changed = session
        changed.correctCount = 1
        try await reopened.save(changed)
        #expect(try await reopened.fetchSessions() == [changed])
    }

    @Test func directoryFailureIsThrownToRequest() async throws {
        let file = FileManager.default.temporaryDirectory.appending(path: "___PACKAGENAMEASIDENTIFIER___File-\(UUID())")
        try Data("not a directory".utf8).write(to: file)
        defer { try? FileManager.default.removeItem(at: file) }
        let repository = SwiftDataManager(storeURL: file.appending(path: "Sessions.store"))
        await #expect(throws: (any Error).self) { try await repository.fetchSessions() }
    }
}
