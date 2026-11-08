import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

struct SwiftDataManagerTests {
    @Test func previouslySavedSessionRemainsDecodable() throws {
        let payload = Data(#"{"id":"F2A0C265-B27A-4151-A33D-BA7925EF2F55","day":0,"isExtraPractice":false,"difficulty":"everyday","question":{"id":"066692FD-1C9F-4C36-983F-B251647B46A9","left":2,"right":3,"choices":[6,7],"wrongAnswers":[7],"isRevealed":false,"isAnswered":true},"questionNumber":2,"correctCount":1}"#.utf8)
        let session = try JSONDecoder().decode(PracticeSession.self, from: payload)
        #expect(session.correctCount == 1)
        #expect(session.question.wrongAnswers == [7])
        #expect(session.question.isAnswered)
        #expect(session.completedAt == nil)
        #expect(try JSONDecoder().decode(PracticeSession.self, from: JSONEncoder().encode(session)) == session)
    }

    @Test func createsDirectoryAndReopensDurableSession() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: "___PROJECTNAME:identifier___Tests-\(UUID())")
        let url = directory.appending(path: "Nested/Sessions.store")
        // SwiftData may retain an open SQLite store; let the system clean it up.
        let first = SwiftDataManager(storeURL: url)
        let session = PracticeSession(id: UUID(), day: Date(), isExtraPractice: false, difficulty: .everyday,
                                      question: MultiplicationQuestion.random(difficulty: .everyday))
        try await first.save(session)
        let reopened = SwiftDataManager(storeURL: url)
        #expect(try await reopened.fetchSessions() == [session])
        let changed = session.updating(correctCount: 1)
        try await reopened.save(changed)
        #expect(try await reopened.fetchSessions() == [changed])
    }

    @Test func directoryFailureIsThrownAndTheSameManagerCanRetry() async throws {
        let file = FileManager.default.temporaryDirectory.appending(path: "___PROJECTNAME:identifier___File-\(UUID())")
        try Data("not a directory".utf8).write(to: file)
        let storeURL = file.appending(path: "Sessions.store")
        defer {
            // Do not unlink a database SwiftData might still have open.
            if !FileManager.default.fileExists(atPath: storeURL.path()) {
                try? FileManager.default.removeItem(at: file)
            }
        }
        let repository = SwiftDataManager(storeURL: storeURL)
        await #expect(throws: (any Error).self) { try await repository.fetchSessions() }
        #expect(try Data(contentsOf: file) == Data("not a directory".utf8))
        try FileManager.default.removeItem(at: file)
        #expect(try await repository.fetchSessions().isEmpty)
    }
}
