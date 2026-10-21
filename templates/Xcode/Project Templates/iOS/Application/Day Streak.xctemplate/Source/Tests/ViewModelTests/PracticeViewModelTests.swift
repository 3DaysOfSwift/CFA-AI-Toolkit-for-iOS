import Foundation
import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct PracticeViewModelTests {
    @Test(arguments: [false, true])
    func resolvedAnswerAdvancesOnceAfterTwoSeconds(reveal: Bool) async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(model.session?.question)
        let command: PracticeFeature.Command = reveal ? .reveal(questionID: question.id) : .answer(questionID: question.id, value: 81)
        await model.perform(command).value
        #expect(model.questionAwaitingAdvanceID == question.id)
        let start = ContinuousClock.now
        async let first: Void = model.advanceAfterFeedback()
        async let repeated: Void = model.advanceAfterFeedback()
        await first
        await repeated
        #expect(start.duration(to: .now) >= .seconds(2))
        #expect(model.session?.questionNumber == 2)
        #expect(model.session?.correctCount == (reveal ? 0 : 1))
        #expect(model.questionAwaitingAdvanceID == nil)
    }

    @Test func wrongAnswersDoNotAdvanceAndCancelledFeedbackPreservesQuestion() async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(model.session?.question)
        await model.perform(.answer(questionID: question.id, value: 72)).value
        #expect(model.questionAwaitingAdvanceID == nil)
        await model.advanceAfterFeedback()
        #expect(model.session?.question.id == question.id)
        await model.perform(.reveal(questionID: question.id)).value
        let delay = Task { await model.advanceAfterFeedback() }
        delay.cancel()
        await delay.value
        #expect(model.session?.question.id == question.id)
        #expect(model.questionAwaitingAdvanceID == question.id)
        await model.advanceAfterFeedback()
        #expect(model.session?.questionNumber == 2)
        #expect(model.session?.correctCount == 0)
    }

    @Test func sessionPresentationTracksDailyExtraAndMidnight() async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))

        #expect(!model.isSessionInProgress)
        try await env.start()
        #expect(model.isSessionInProgress)
        let resumedModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                             settingsFeature: SettingsFeature(defaults: defaults))
        #expect(resumedModel.isSessionInProgress)
        try await env.finish()
        #expect(!model.isSessionInProgress)
        try await env.practice.perform(.start(extra: true, difficulty: .everyday))
        #expect(model.isSessionInProgress)
        try await env.finish()
        #expect(!model.isSessionInProgress)

        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        try await env.start()
        #expect(model.isSessionInProgress)
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        await model.refresh().value
        #expect(!model.isSessionInProgress)
    }

    @Test func distinctTapsQueueInsteadOfDroppingTheSecondAnswer() async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(model.session?.question)
        let wrong = model.perform(.answer(questionID: question.id, value: 72))
        let correct = model.perform(.answer(questionID: question.id, value: 81))
        await wrong.value
        await correct.value
        #expect(model.session?.question.isAnswered == true)
        #expect(model.session?.question.wrongAnswers == [72])
        #expect(model.session?.correctCount == 0)
    }

    @Test func commandsCoalesceWhileSaveIsInFlight() async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        await env.repository.pauseNextSave()
        let question = try #require(model.session?.question)
        let first = model.perform(.answer(questionID: question.id, value: 81))
        // Bounded yielding waits for the deterministic persistence gate, not a guessed delay.
        for _ in 0..<10_000 {
            if await env.repository.isWaiting() { break }
            await Task.yield()
        }
        #expect(await env.repository.isWaiting())
        let second = model.perform(.answer(questionID: question.id, value: 81))
        #expect(model.session?.correctCount == 0)
        await env.repository.resumeSave()
        await first.value
        await second.value
        #expect(model.session?.correctCount == 1)
        #expect(await env.repository.saveCount == 2) // start + one answer
        #expect(model.feedback.contains("One point"))
    }

    @Test func errorAndRetryAreScreenScoped() async throws {
        let env = TestEnvironment()
        let name = "___PACKAGENAMEASIDENTIFIER___Tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let model = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        await env.repository.fail(true)
        await model.perform(.refresh).value
        #expect(model.errorMessage != nil)
        await env.repository.fail(false)
        await model.perform(.refresh).value
        #expect(model.errorMessage == nil)
        #expect(model.hasLoaded)
    }
}
