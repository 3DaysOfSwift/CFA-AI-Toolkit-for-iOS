import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct PracticeFeatureTests {
    @Test func correctAnswerIsScoredOnlyOnce() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        async let first: Void = env.practice.perform(.answer(questionID: question.id, value: 81))
        async let duplicate: Void = env.practice.perform(.answer(questionID: question.id, value: 81))
        try await first
        try await duplicate
        #expect(env.practice.currentSession?.correctCount == 1)
        #expect(env.practice.currentSession?.question.isAnswered == true)
    }

    @Test func wrongAnswerStaysRedAndDisqualifiesQuestion() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        try await env.practice.perform(.answer(questionID: question.id, value: 72))
        try await env.practice.perform(.answer(questionID: question.id, value: 81))
        #expect(env.practice.currentSession?.question.wrongAnswers == [72])
        #expect(env.practice.currentSession?.correctCount == 0)
    }

    @Test func revealNeverScoresEvenAfterTappingCorrect() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        try await env.practice.perform(.reveal(questionID: question.id))
        try await env.practice.perform(.answer(questionID: question.id, value: 81))
        #expect(env.practice.currentSession?.correctCount == 0)
        #expect(env.practice.currentSession?.question.isRevealed == true)
    }

    @Test func twentyCorrectCompletesMainThenOnlyOneExtraAllowed() async throws {
        let env = TestEnvironment()
        try await env.start()
        try await env.finish()
        #expect(env.practice.currentSession?.correctCount == 20)
        #expect(env.practice.canStartExtraPractice)
        #expect(env.streak.currentStreak == 1)
        try await env.practice.perform(.start(extra: true, difficulty: .challenge))
        try await env.finish()
        #expect(env.practice.isDayLocked)
        #expect(env.streak.currentStreak == 1)
        #expect(env.streak.correctAnswerCount == 40)
        await #expect(throws: PracticeError.self) { try await env.practice.perform(.start(extra: true, difficulty: .gentle)) }
        await #expect(throws: PracticeError.self) { try await env.start() }
    }

    @Test func extraCannotStartBeforeDailyCompletion() async throws {
        let env = TestEnvironment()
        await #expect(throws: PracticeError.self) {
            try await env.practice.perform(.start(extra: true, difficulty: .gentle))
        }
    }

    @Test func nineteenAnswersRemainIncompleteAndTwentiethCompletes() async throws {
        let env = TestEnvironment()
        try await env.start()
        for count in 1...20 {
            let question = try #require(env.practice.currentSession?.question)
            try await env.practice.perform(.answer(questionID: question.id, value: question.answer))
            #expect(env.practice.currentSession?.correctCount == count)
            #expect(env.practice.currentSession?.isComplete == (count == 20))
            if count < 20 { try await env.practice.perform(.next(questionID: question.id)) }
        }
    }

    @Test(arguments: [20, 25])
    func savedProgressAboveNewTargetCompletesWithoutLosingAnswers(count: Int) async throws {
        let env = TestEnvironment()
        try await env.start()
        var saved = try #require(env.practice.currentSession)
        saved.correctCount = count
        try await env.repository.save(saved)
        let reopened = TestEnvironment(repository: env.repository, clock: env.clock)
        try await reopened.practice.perform(.refresh)
        #expect(reopened.practice.currentSession?.isComplete == true)
        #expect(reopened.practice.currentSession?.correctCount == count)
        #expect(reopened.practice.canStartExtraPractice)
        #expect(reopened.streak.currentStreak == 1)
        #expect(try await env.repository.fetchSessions().first?.isComplete == true)
    }

    @Test func lockedDaySurvivesReopeningAndUnlocksTomorrow() async throws {
        let env = TestEnvironment()
        try await env.start()
        try await env.finish()
        try await env.practice.perform(.start(extra: true, difficulty: .everyday))
        try await env.finish()
        let reopened = TestEnvironment(repository: env.repository, clock: env.clock)
        try await reopened.practice.perform(.refresh)
        #expect(reopened.practice.isDayLocked)
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        try await reopened.practice.perform(.refresh)
        #expect(!reopened.practice.isDayLocked)
        try await reopened.start()
        #expect(reopened.practice.currentSession?.correctCount == 0)
        #expect(reopened.streak.currentStreak == 1)
    }

    @Test func difficultyLocksAtSecondQuestionAndCannotFarmPoints() async throws {
        let env = TestEnvironment()
        try await env.start()
        let first = try #require(env.practice.currentSession?.question)
        try await env.practice.perform(.answer(questionID: first.id, value: 81))
        try await env.practice.perform(.difficulty(.challenge))
        #expect(env.practice.currentSession?.correctCount == 0)
        let replacement = try #require(env.practice.currentSession?.question)
        try await env.practice.perform(.reveal(questionID: replacement.id))
        try await env.practice.perform(.next(questionID: replacement.id))
        #expect(env.practice.currentSession?.canChangeDifficulty == false)
        await #expect(throws: PracticeError.self) { try await env.practice.perform(.difficulty(.gentle)) }
        #expect(env.practice.currentSession?.difficulty == .challenge)
    }

    @Test func oldQuestionAndUnresolvedNextAreRejected() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        await #expect(throws: PracticeError.self) { try await env.practice.perform(.next(questionID: question.id)) }
        try await env.practice.perform(.reveal(questionID: question.id))
        try await env.practice.perform(.next(questionID: question.id))
        await #expect(throws: PracticeError.self) { try await env.practice.perform(.answer(questionID: question.id, value: 81)) }
    }

    @Test func reopeningRestoresProgressAndRevealedQuestion() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        try await env.practice.perform(.reveal(questionID: question.id))
        let reopened = TestEnvironment(repository: env.repository, clock: env.clock)
        try await reopened.practice.perform(.refresh)
        #expect(reopened.practice.currentSession == env.practice.currentSession)
    }

    @Test func failedWriteLeavesAnswerRetryable() async throws {
        let env = TestEnvironment()
        try await env.start()
        let question = try #require(env.practice.currentSession?.question)
        await env.repository.fail(true)
        await #expect(throws: TestFailure.self) { try await env.practice.perform(.answer(questionID: question.id, value: 81)) }
        #expect(env.practice.currentSession?.correctCount == 0)
        #expect(env.practice.currentSession?.question.isResolved == false)
        await env.repository.fail(false)
        try await env.practice.perform(.answer(questionID: question.id, value: 81))
        #expect(env.practice.currentSession?.correctCount == 1)
    }

    @Test func failedFetchDoesNotCreateOrOverwriteData() async throws {
        let env = TestEnvironment()
        await env.repository.fail(true)
        await #expect(throws: TestFailure.self) { try await env.start() }
        #expect(!env.practice.hasLoaded)
        #expect(await env.repository.saveCount == 0)
        await env.repository.fail(false)
        try await env.start()
        #expect(env.practice.currentSession != nil)
    }

    @Test func midnightUnlocksDailyAndAbandonsIncompletePreviousDay() async throws {
        let env = TestEnvironment()
        try await env.start()
        let oldQuestion = try #require(env.practice.currentSession?.question)
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        try await env.practice.perform(.refresh)
        #expect(env.practice.currentSession == nil)
        #expect(env.streak.currentStreak == 0)
        await #expect(throws: PracticeError.self) { try await env.practice.perform(.answer(questionID: oldQuestion.id, value: 81)) }
        try await env.start()
        #expect(env.practice.sessions.count == 2)
    }

    @Test func concurrentStartsDoNotCreateDuplicateSessions() async throws {
        let env = TestEnvironment()
        let first = Task { try await env.start() }
        let second = Task { try await env.start() }
        _ = await first.result
        _ = await second.result
        #expect(env.practice.sessions.count == 1)
        #expect(await env.repository.saveCount == 1)
    }

    @Test func questionChoicesAreUniqueAndIncludeCorrectAnswer() {
        for difficulty in Difficulty.allCases {
            for _ in 0..<200 {
                let question = MultiplicationQuestion.random(difficulty: difficulty)
                #expect(question.choices.count == 9)
                #expect(Set(question.choices).count == 9)
                #expect(question.choices.contains(question.answer))
                #expect(difficulty.factors.contains(question.left))
            }
        }
    }
}
