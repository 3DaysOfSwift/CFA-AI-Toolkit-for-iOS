import Foundation
import Observation

@MainActor
@Observable
final class AddHabitViewModel {
    private let habitsFeature: HabitsFeature
    var name = ""
    var tracking: HabitTracking = .completion
    var unit = ""
    var dailyTargetText = ""
    var errorMessage: String?
    var isSaving = false
    var didSave = false
    private var saveTask: Task<Void, Never>?

    init(habitsFeature: HabitsFeature = AppModel.shared.habitsFeature) {
        self.habitsFeature = habitsFeature
    }

    @discardableResult
    func save() -> Task<Void, Never> {
        if let saveTask { return saveTask }
        isSaving = true
        let habitsFeature = self.habitsFeature
        let submittedName = name
        let submittedTracking = tracking
        let submittedUnit = unit
        let submittedTargetText = dailyTargetText
        let task = Task {
            defer {
                isSaving = false
                saveTask = nil
            }
            do {
                let parsedTarget = submittedTargetText.isEmpty ? nil : Int(submittedTargetText)
                if !submittedTargetText.isEmpty, parsedTarget == nil {
                    throw HabitError.invalidTarget
                }
                try await habitsFeature.addHabit(name: submittedName, tracking: submittedTracking,
                                                 unit: submittedUnit, dailyTarget: parsedTarget)
                errorMessage = nil
                didSave = true
            } catch {
                errorMessage = message(for: error)
            }
        }
        saveTask = task
        return task
    }

    private func message(for error: any Error) -> String {
        guard let habitError = error as? HabitError else {
            return "Your habit could not be saved. Please try again."
        }
        return switch habitError {
        case .invalidName: "Enter a name for this habit."
        case .invalidTarget: "The daily target must be greater than zero."
        case .invalidEntry: "A recorded amount cannot be negative."
        case .habitNotFound: "This habit is no longer available."
        }
    }
}
