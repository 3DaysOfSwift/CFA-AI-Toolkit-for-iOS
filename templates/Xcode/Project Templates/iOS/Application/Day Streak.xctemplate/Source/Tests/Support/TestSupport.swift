import Foundation
@testable import ___PACKAGENAMEASIDENTIFIER___

enum TestFailure: Error { case storage }

actor MemorySessions: SessionRepository {
    var sessions: [PracticeSession]
    var shouldFail = false
    private(set) var saveCount = 0
    private(set) var fetchCount = 0
    private var saveGate: CheckedContinuation<Void, Never>?
    private var shouldPause = false

    init(_ sessions: [PracticeSession] = []) { self.sessions = sessions }
    func fail(_ value: Bool) { shouldFail = value }
    func pauseNextSave() { shouldPause = true }
    func isWaiting() -> Bool { saveGate != nil }
    func resumeSave() { saveGate?.resume(); saveGate = nil }

    func fetchSessions() throws -> [PracticeSession] {
        fetchCount += 1
        if shouldFail { throw TestFailure.storage }
        return sessions
    }

    func save(_ session: PracticeSession) async throws {
        if shouldPause {
            shouldPause = false
            await withCheckedContinuation { saveGate = $0 }
        }
        if shouldFail { throw TestFailure.storage }
        saveCount += 1
        sessions.removeAll { $0.id == session.id }
        sessions.append(session)
    }
}

@MainActor
final class TestClock {
    var date: Date
    init(_ date: Date = Date(timeIntervalSince1970: 1_800_446_400)) { self.date = date }
}

@MainActor
struct TestEnvironment {
    let repository: MemorySessions
    let clock: TestClock
    let calendar: Calendar
    let practice: PracticeFeature
    let streak: DayStreakFeature

    init(repository: MemorySessions = MemorySessions(), clock: TestClock = TestClock()) {
        self.repository = repository
        self.clock = clock
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .gmt
        self.calendar = calendar
        let practice = PracticeFeature(repository: repository, calendar: calendar, now: { clock.date }, makeQuestion: { _ in
            MultiplicationQuestion(id: UUID(), left: 9, right: 9, choices: [72, 81, 90, 63, 54, 80, 82, 99, 100])
        })
        self.practice = practice
        streak = DayStreakFeature(practiceFeature: practice, calendar: calendar)
    }

    func start() async throws { try await practice.perform(.start(extra: false, difficulty: .everyday)) }
    func finish() async throws {
        while let session = practice.currentSession, !session.isComplete {
            if session.question.isResolved { try await practice.perform(.next(questionID: session.question.id)) }
            guard let question = practice.currentSession?.question else { return }
            try await practice.perform(.answer(questionID: question.id, value: question.answer))
        }
    }
}
