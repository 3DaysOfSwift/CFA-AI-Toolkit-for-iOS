import Foundation
import Testing
@testable import TimesThirty

@MainActor
struct PracticeViewModelTests {
    @Test func readsTheGeneratedAppIdentityForItsNavigationTitle() throws {
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let env = TestEnvironment()
        let settings = SettingsFeature(defaults: defaults)
        let viewModel = PracticeViewModel(
            practiceFeature: env.practice,
            dayStreakFeature: env.streak,
            settingsFeature: settings,
            appInformation: AppInformation(appName: "My Practice")
        )

        #expect(viewModel.appName == "My Practice")
    }

    @Test func answerFeedbackReflectsQuestionState() throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        let question = MultiplicationQuestion(id: UUID(), left: 3, right: 4, choices: [12, 13])
        #expect(!viewModel.isCorrectAnswer(12, in: question))
        let attempted = question.updating(wrongAnswers: [13])
        #expect(viewModel.isIncorrectAnswer(13, in: attempted))
        #expect(!viewModel.isIncorrectAnswer(12, in: attempted))
        let revealed = attempted.updating(isRevealed: true)
        #expect(viewModel.isCorrectAnswer(12, in: revealed))
        #expect(!viewModel.isCorrectAnswer(13, in: revealed))
        #expect(viewModel.difficultyDescription(.gentle) == "2–5 times tables")
        #expect(viewModel.difficultyDescription(.everyday) == "2–12 times tables")
        #expect(viewModel.difficultyDescription(.challenge) == "6–19 times tables")
    }

    @Test(arguments: [false, true])
    func resolvedAnswerAdvancesOnceAfterTwoSeconds(reveal: Bool) async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(viewModel.session?.question)
        let command: PracticeFeature.Command = reveal ? .reveal(questionID: question.id) : .answer(questionID: question.id, value: 81)
        await viewModel.perform(command).value
        #expect(viewModel.questionAwaitingAdvanceID == question.id)
        let start = ContinuousClock.now
        async let first: Void = viewModel.advanceAfterFeedback()
        async let repeated: Void = viewModel.advanceAfterFeedback()
        await first
        await repeated
        #expect(start.duration(to: .now) >= .seconds(2))
        #expect(viewModel.session?.questionNumber == 2)
        #expect(viewModel.session?.correctCount == (reveal ? 0 : 1))
        #expect(viewModel.questionAwaitingAdvanceID == nil)
    }

    @Test func wrongAnswersDoNotAdvanceAndCancelledFeedbackPreservesQuestion() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(viewModel.session?.question)
        await viewModel.perform(.answer(questionID: question.id, value: 72)).value
        #expect(viewModel.questionAwaitingAdvanceID == nil)
        await viewModel.advanceAfterFeedback()
        #expect(viewModel.session?.question.id == question.id)
        await viewModel.perform(.reveal(questionID: question.id)).value
        let delay = Task { await viewModel.advanceAfterFeedback() }
        delay.cancel()
        await delay.value
        #expect(viewModel.session?.question.id == question.id)
        #expect(viewModel.questionAwaitingAdvanceID == question.id)
        await viewModel.advanceAfterFeedback()
        #expect(viewModel.session?.questionNumber == 2)
        #expect(viewModel.session?.correctCount == 0)
    }

    @Test func sessionPresentationTracksDailyExtraAndMidnight() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))

        #expect(!viewModel.isSessionInProgress)
        try await env.start()
        #expect(viewModel.isSessionInProgress)
        let resumedViewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                                 settingsFeature: SettingsFeature(defaults: defaults))
        #expect(resumedViewModel.isSessionInProgress)
        try await env.finish()
        #expect(!viewModel.isSessionInProgress)
        try await env.practice.perform(.start(extra: true, difficulty: .everyday))
        #expect(viewModel.isSessionInProgress)
        try await env.finish()
        #expect(!viewModel.isSessionInProgress)

        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        try await env.start()
        #expect(viewModel.isSessionInProgress)
        env.clock.date = try #require(env.calendar.date(byAdding: .day, value: 1, to: env.clock.date))
        await viewModel.refresh().value
        #expect(!viewModel.isSessionInProgress)
    }

    @Test func distinctTapsQueueInsteadOfDroppingTheSecondAnswer() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        let question = try #require(viewModel.session?.question)
        let wrong = viewModel.perform(.answer(questionID: question.id, value: 72))
        let correct = viewModel.perform(.answer(questionID: question.id, value: 81))
        await wrong.value
        await correct.value
        #expect(viewModel.session?.question.isAnswered == true)
        #expect(viewModel.session?.question.wrongAnswers == [72])
        #expect(viewModel.session?.correctCount == 0)
    }

    @Test func commandsCoalesceWhileSaveIsInFlight() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        await env.repository.pauseNextSave()
        let question = try #require(viewModel.session?.question)
        let first = viewModel.perform(.answer(questionID: question.id, value: 81))
        // Bounded yielding waits for the deterministic persistence gate, not a guessed delay.
        for _ in 0..<10_000 {
            if await env.repository.isWaiting() { break }
            await Task.yield()
        }
        #expect(await env.repository.isWaiting())
        let second = viewModel.perform(.answer(questionID: question.id, value: 81))
        #expect(viewModel.session?.correctCount == 0)
        await env.repository.resumeSave()
        await first.value
        await second.value
        #expect(viewModel.session?.correctCount == 1)
        #expect(await env.repository.saveCount == 2) // start + one answer
        #expect(viewModel.feedback.contains("One point"))
    }

    @Test func returningToAnEarlierDifficultyKeepsTheLastSelection() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        try await env.start()
        await env.repository.pauseNextSave()
        let first = viewModel.perform(.difficulty(.gentle))
        for _ in 0..<10_000 {
            if await env.repository.isWaiting() { break }
            await Task.yield()
        }
        #expect(await env.repository.isWaiting())
        let second = viewModel.perform(.difficulty(.challenge))
        let third = viewModel.perform(.difficulty(.gentle))
        await env.repository.resumeSave()
        await first.value
        await second.value
        await third.value
        #expect(viewModel.session?.difficulty == .gentle)
        #expect(await env.repository.saveCount == 4) // start + three selections
    }

    @Test func successfulRefreshClearsAnEarlierLoadError() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        await env.repository.fail(true)
        await viewModel.refresh().value
        #expect(viewModel.errorMessage == "Your saved practice could not be loaded. Please try again.")
        await env.repository.fail(false)
        await viewModel.refresh().value
        #expect(viewModel.hasLoaded)
        #expect(viewModel.errorMessage == nil)
    }

    @Test func errorAndRetryAreScreenScoped() async throws {
        let env = TestEnvironment()
        let name = "TimesThirtyTests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let viewModel = PracticeViewModel(practiceFeature: env.practice, dayStreakFeature: env.streak,
                                      settingsFeature: SettingsFeature(defaults: defaults))
        await env.repository.fail(true)
        await viewModel.perform(.refresh).value
        #expect(viewModel.errorMessage == "Your saved practice could not be loaded. Please try again.")
        await env.repository.fail(false)
        await viewModel.retry().value
        #expect(viewModel.errorMessage == nil)
        #expect(viewModel.hasLoaded)
    }
}
