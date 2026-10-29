import Foundation
import Observation

@MainActor @Observable
final class PracticeFeature {
    enum Command: Hashable {
        case refresh
        case start(extra: Bool, difficulty: Difficulty)
        case answer(questionID: UUID, value: Int)
        case reveal(questionID: UUID)
        case next(questionID: UUID)
        case difficulty(Difficulty)
    }

    private(set) var sessions: [PracticeSession] = []
    private(set) var today: Date
    private(set) var hasLoaded = false
    let calendar: Calendar
    private let repository: any SessionRepository
    private let now: () -> Date
    private let makeQuestion: (Difficulty) -> MultiplicationQuestion
    @ObservationIgnored private var operationTask: Task<Void, Error>?
    @ObservationIgnored private var operationID: UUID?

    init(repository: any SessionRepository, calendar: Calendar = .current,
         now: @escaping () -> Date = Date.init,
         makeQuestion: @escaping (Difficulty) -> MultiplicationQuestion = MultiplicationQuestion.random) {
        self.repository = repository
        self.calendar = calendar
        self.now = now
        self.makeQuestion = makeQuestion
        today = calendar.startOfDay(for: now())
    }

    var todaySessions: [PracticeSession] {
        sessions.filter { calendar.isDate($0.day, inSameDayAs: today) }
    }
    var currentSession: PracticeSession? {
        todaySessions.first(where: { $0.isExtraPractice }) ?? todaySessions.first
    }
    var canStartExtraPractice: Bool {
        todaySessions.contains(where: { !$0.isExtraPractice && $0.isComplete }) &&
        !todaySessions.contains(where: { $0.isExtraPractice })
    }
    var isDayLocked: Bool {
        todaySessions.contains(where: { $0.isExtraPractice && $0.isComplete })
    }
    // This is the reusable activity boundary. Streaks need dates, not math questions.
    var completedActivityDays: Set<Date> {
        Set(sessions.filter { !$0.isExtraPractice && $0.isComplete }.map { $0.day })
    }

    func perform(_ command: Command) async throws {
        let predecessor = operationTask
        let identifier = UUID()
        let task = Task { @MainActor in
            // A failed write does not poison subsequent retries. Distinct commands stay ordered.
            _ = try? await predecessor?.value
            try Task.checkCancellation()
            try await self.execute(command)
        }
        operationTask = task
        operationID = identifier
        defer {
            if operationID == identifier {
                operationTask = nil
                operationID = nil
            }
        }
        try await task.value
    }

    private func execute(_ command: Command) async throws {
        today = calendar.startOfDay(for: now())
        if !hasLoaded {
            var storedSessions = try await repository.fetchSessions()
            // Honour today's progress saved before the daily target was reduced.
            // Missed past days stay incomplete; historical scores remain unchanged.
            for index in storedSessions.indices where
                calendar.isDate(storedSessions[index].day, inSameDayAs: today) &&
                !storedSessions[index].isComplete &&
                storedSessions[index].correctCount >= PracticeSession.target {
                storedSessions[index].completedAt = now()
                try await repository.save(storedSessions[index])
            }
            sessions = storedSessions
            hasLoaded = true
        }
        switch command {
        case .refresh:
            return
        case let .start(extra, difficulty):
            guard extra ? canStartExtraPractice : todaySessions.isEmpty else {
                throw PracticeError.unavailableSession
            }
            let session = PracticeSession(id: UUID(), day: today, isExtraPractice: extra,
                                          difficulty: difficulty, question: makeQuestion(difficulty))
            try await save(session)
        default:
            guard var session = currentSession, !session.isComplete else {
                throw PracticeError.unavailableSession
            }
            switch command {
            case let .answer(questionID, value):
                guard session.question.id == questionID else { throw PracticeError.staleQuestion }
                guard !session.question.isResolved, session.question.choices.contains(value) else { return }
                if value == session.question.answer {
                    session.question.isAnswered = true
                    if session.question.wrongAnswers.isEmpty {
                        session.correctCount += 1
                    }
                    if session.correctCount >= PracticeSession.target { session.completedAt = now() }
                } else {
                    session.question.wrongAnswers.insert(value)
                }
            case let .reveal(questionID):
                guard session.question.id == questionID else { throw PracticeError.staleQuestion }
                guard !session.question.isResolved else { return }
                session.question.isRevealed = true
            case let .next(questionID):
                guard session.question.id == questionID else { throw PracticeError.staleQuestion }
                guard session.question.isResolved else { throw PracticeError.unresolvedQuestion }
                session.questionNumber += 1
                session.question = makeQuestion(session.difficulty)
            case let .difficulty(difficulty):
                guard session.canChangeDifficulty else { throw PracticeError.difficultyLocked }
                // Changing the first question must not bank repeatable points.
                session.difficulty = difficulty
                session.correctCount = 0
                session.question = makeQuestion(difficulty)
            case .refresh, .start:
                return
            }
            try await save(session)
        }
    }

    private func save(_ session: PracticeSession) async throws {
        // Publish only durable results; failed writes leave the same question ready for retry.
        try await repository.save(session)
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[index] = session
        } else {
            sessions.append(session)
        }
    }
}
