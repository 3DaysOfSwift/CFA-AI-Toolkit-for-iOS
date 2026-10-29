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

    func save() {
        guard saveTask == nil else { return }
        isSaving = true
        let habitsFeature = self.habitsFeature
        saveTask = Task {
            defer {
                isSaving = false
                saveTask = nil
            }
            do {
                let parsedTarget = dailyTargetText.isEmpty ? nil : Int(dailyTargetText)
                if !dailyTargetText.isEmpty, parsedTarget == nil {
                    throw HabitError.invalidTarget
                }
                try await habitsFeature.addHabit(name: name, tracking: tracking,
                                                 unit: unit, dailyTarget: parsedTarget)
                errorMessage = nil
                didSave = true
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
