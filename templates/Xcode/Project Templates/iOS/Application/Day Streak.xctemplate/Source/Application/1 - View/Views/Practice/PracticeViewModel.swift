import Foundation
import Observation

@MainActor @Observable
final class PracticeViewModel {
    private let practiceFeature: PracticeFeature
    private let dayStreakFeature: DayStreakFeature
    private let settingsFeature: SettingsFeature
    private(set) var errorMessage: String?
    @ObservationIgnored private var queuedCommandTask: Task<Void, Never>?
    @ObservationIgnored private var pendingCommandTasks: [PracticeFeature.Command: Task<Void, Never>] = [:]
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
            do { try await practiceFeature.perform(.refresh) }
            catch {
                retryCommand = .refresh
                errorMessage = error.localizedDescription
            }
        }
        refreshTask = task
        return task
    }

    @discardableResult
    func perform(_ command: PracticeFeature.Command) -> Task<Void, Never> {
        if let task = pendingCommandTasks[command] { return task }
        let predecessor = queuedCommandTask
        let identifier = UUID()
        let task = Task { @MainActor in
            await predecessor?.value
            defer {
                pendingCommandTasks[command] = nil
                if lastCommandID == identifier {
                    queuedCommandTask = nil
                    lastCommandID = nil
                }
            }
            errorMessage = nil
            retryCommand = command
            do { try await practiceFeature.perform(command) }
            catch { errorMessage = error.localizedDescription }
        }
        queuedCommandTask = task
        pendingCommandTasks[command] = task
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

    func retry() { perform(retryCommand) }
}
