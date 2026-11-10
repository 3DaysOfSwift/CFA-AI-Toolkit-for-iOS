import Foundation
import Observation

@MainActor @Observable
final class PracticeViewModel {
    private let practiceFeature: PracticeFeature
    private let dayStreakFeature: DayStreakFeature
    private let settingsFeature: SettingsFeature
    private(set) var errorMessage: String?
    @ObservationIgnored private var queuedCommandTask: Task<Void, Never>?
    @ObservationIgnored private var lastQueuedCommand: PracticeFeature.Command?
    @ObservationIgnored private var lastCommandID: UUID?
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private var automaticAdvanceTask: Task<Void, Never>?
    @ObservationIgnored private var automaticAdvanceID: UUID?
    @ObservationIgnored private var scheduledQuestionID: UUID?
    @ObservationIgnored private var retryCommand: PracticeFeature.Command = .refresh

    init(practiceFeature: PracticeFeature = AppModel.shared.practiceFeature,
         dayStreakFeature: DayStreakFeature = AppModel.shared.dayStreakFeature,
         settingsFeature: SettingsFeature = AppModel.shared.settingsFeature) {
        self.practiceFeature = practiceFeature
        self.dayStreakFeature = dayStreakFeature
        self.settingsFeature = settingsFeature
    }

    var session: PracticeSession? { practiceFeature.currentSession }
    var isSessionInProgress: Bool { session?.isComplete == false }
    var questionAwaitingAdvanceID: UUID? {
        guard let session, !session.isComplete, session.question.isResolved else { return nil }
        return session.question.id
    }
    var hasLoaded: Bool { practiceFeature.hasLoaded }
    var canStartExtraPractice: Bool { practiceFeature.canStartExtraPractice }
    var isDayLocked: Bool { practiceFeature.isDayLocked }
    var streak: Int { dayStreakFeature.currentStreak }
    var week: [StreakDay] { dayStreakFeature.week }
    var preferredDifficulty: Difficulty { settingsFeature.preferredDifficulty }
    func difficultyDescription(_ difficulty: Difficulty) -> String {
        switch difficulty {
        case .gentle: "2–5 times tables"
        case .everyday: "2–12 times tables"
        case .challenge: "6–19 times tables"
        }
    }
    func isCorrectAnswer(_ answer: Int, in question: MultiplicationQuestion) -> Bool {
        question.isResolved && answer == question.answer
    }

    func isIncorrectAnswer(_ answer: Int, in question: MultiplicationQuestion) -> Bool {
        question.wrongAnswers.contains(answer)
    }

    var feedback: String {
        guard let question = session?.question else { return "" }
        if question.isRevealed { return "Answer revealed. This question earns no point." }
        if question.isAnswered {
            return question.wrongAnswers.isEmpty ? "That's right. One point earned!" : "You've found it! No point this time—keep going."
        }
        if !question.wrongAnswers.isEmpty { return "Not quite. Try another answer. This question won't earn a point." }
        return "Tap the question to reveal the answer."
    }

    @discardableResult
    func refresh() -> Task<Void, Never> {
        if let refreshTask { return refreshTask }
        let task = Task { @MainActor in
            defer { refreshTask = nil }
            do {
                try await practiceFeature.perform(.refresh)
                errorMessage = nil
            } catch {
                retryCommand = .refresh
                errorMessage = "Your saved practice could not be loaded. Please try again."
            }
        }
        refreshTask = task
        return task
    }

    @discardableResult
    func perform(_ command: PracticeFeature.Command) -> Task<Void, Never> {
        if lastQueuedCommand == command, let queuedCommandTask { return queuedCommandTask }
        let predecessor = queuedCommandTask
        let identifier = UUID()
        let task = Task { @MainActor in
            await predecessor?.value
            defer {
                if lastCommandID == identifier {
                    queuedCommandTask = nil
                    lastCommandID = nil
                    lastQueuedCommand = nil
                }
            }
            errorMessage = nil
            retryCommand = command
            do { try await practiceFeature.perform(command) }
            catch { errorMessage = message(for: error, command: command) }
        }
        queuedCommandTask = task
        lastQueuedCommand = command
        lastCommandID = identifier
        return task
    }

    // This delay belongs to the visible question, not to the durable save operation.
    func advanceAfterFeedback() async {
        guard let questionID = questionAwaitingAdvanceID else { return }
        if let task = automaticAdvanceTask, scheduledQuestionID == questionID, !task.isCancelled {
            await withTaskCancellationHandler {
                await task.value
            } onCancel: {
                task.cancel()
            }
            return
        }

        automaticAdvanceTask?.cancel()
        let identifier = UUID()
        let task = Task { @MainActor in
            do {
                try await Task.sleep(for: .seconds(2))
                try Task.checkCancellation()
                guard questionAwaitingAdvanceID == questionID else { return }
                await perform(.next(questionID: questionID)).value
            } catch {
                // Leaving the screen cancels only feedback timing; saved progress is untouched.
            }
        }
        automaticAdvanceTask = task
        automaticAdvanceID = identifier
        scheduledQuestionID = questionID
        defer {
            if automaticAdvanceID == identifier {
                automaticAdvanceTask = nil
                automaticAdvanceID = nil
                scheduledQuestionID = nil
            }
        }
        await withTaskCancellationHandler {
            await task.value
        } onCancel: {
            task.cancel()
        }
    }

    @discardableResult
    func retry() -> Task<Void, Never> { perform(retryCommand) }

    private func message(for error: any Error, command: PracticeFeature.Command) -> String {
        if command == .refresh {
            return "Your saved practice could not be loaded. Please try again."
        }
        guard let practiceError = error as? PracticeError else {
            return "Your practice could not be saved. Please try again."
        }
        return switch practiceError {
        case .unavailableSession: "This session is no longer available. Refresh to see today's practice."
        case .staleQuestion: "The question has changed. Please answer the question now on screen."
        case .difficultyLocked: "Difficulty is fixed after the first question."
        case .unresolvedQuestion: "Find or reveal the correct answer before continuing."
        }
    }
}
