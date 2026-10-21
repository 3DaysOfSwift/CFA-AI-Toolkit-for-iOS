import Foundation
import Observation

@MainActor
@Observable
final class TodayViewModel {
    private let todayFeature: TodayFeature
    private var recordTask: Task<Void, Never>?
    private var amountDrafts: [UUID: String] = [:]
    private var pendingValues: [UUID: Int] = [:]
    private var failedValues: [UUID: Int] = [:]
    private var recordingHabitID: UUID?
    var errorMessage: String?

    init(todayFeature: TodayFeature = AppModel.shared.todayFeature) {
        self.todayFeature = todayFeature
    }

    var habits: [Habit] { todayFeature.habits }
    var isLoading: Bool { todayFeature.isLoading }
    var loadError: String? { todayFeature.loadError }
    func retryLoading() async { await todayFeature.reload() }
    var completedCount: Int { todayFeature.completedCount }
    var todayHeading: String { Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()) }
    var isRecording: Bool { recordTask != nil }

    func toggle(_ habit: Habit) {
        guard !isSaving(habit) else { return }
        guard let value = todayFeature.valueForTogglingCompletion(habitID: habit.id) else { return }
        startRecording(habitID: habit.id, value: value)
    }

    func amountText(for habit: Habit) -> String {
        let currentHabit = habits.first(where: { $0.id == habit.id }) ?? habit
        return amountDrafts[habit.id] ?? String(currentHabit.todayValue)
    }

    func editAmount(_ text: String, for habit: Habit) {
        amountDrafts[habit.id] = text
        guard let value = Int(text), value >= 0 else { return }
        startRecording(habitID: habit.id, value: value)
    }

    func increment(_ habit: Habit) {
        guard let value = Int(amountText(for: habit)), value >= 0, value < Int.max else { return }
        editAmount(String(value + 1), for: habit)
    }

    func canIncrement(_ habit: Habit) -> Bool {
        guard let value = Int(amountText(for: habit)) else { return false }
        return value >= 0 && value < Int.max
    }

    func isSaving(_ habit: Habit) -> Bool {
        recordingHabitID == habit.id || pendingValues[habit.id] != nil
    }

    func statusText(for habit: Habit) -> String? {
        if let draft = amountDrafts[habit.id], Int(draft).map({ $0 >= 0 }) != true {
            return "Enter a whole number of zero or more."
        }
        if isSaving(habit) { return "Saving…" }
        if failedValues[habit.id] != nil { return "Not saved. Tap Retry to try again." }
        return nil
    }

    func needsRetry(_ habit: Habit) -> Bool { failedValues[habit.id] != nil }

    func retrySaving() {
        let values = failedValues
        errorMessage = nil
        for (habitID, value) in values {
            startRecording(habitID: habitID, value: value)
        }
    }

    func waitForPendingSaves() async {
        await recordTask?.value
    }

    private func startRecording(habitID: UUID, value: Int) {
        pendingValues[habitID] = value
        failedValues[habitID] = nil
        guard recordTask == nil else { return }
        // Durable edits survive navigation. Serialize writes and keep the newest
        // pending value per habit; never discard typing while a write is suspended.
        recordTask = Task {
            defer {
                recordingHabitID = nil
                recordTask = nil
            }
            while let (habitID, value) = pendingValues.first {
                pendingValues[habitID] = nil
                recordingHabitID = habitID
                do {
                    try await todayFeature.recordToday(habitID: habitID, value: value)
                    if pendingValues[habitID] == nil && amountDrafts[habitID] == String(value) {
                        amountDrafts[habitID] = nil
                    }
                    if failedValues.isEmpty { errorMessage = nil }
                } catch {
                    if pendingValues[habitID] == nil {
                        failedValues[habitID] = value
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }
}
