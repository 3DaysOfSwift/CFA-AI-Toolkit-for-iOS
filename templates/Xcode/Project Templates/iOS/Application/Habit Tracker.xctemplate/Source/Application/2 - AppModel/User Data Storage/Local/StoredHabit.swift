import Foundation
import SwiftData

@Model
final class StoredHabit {
    @Attribute(.unique) var id: UUID
    var name: String
    var trackingRawValue: String
    var unit: String
    var dailyTarget: Int?

    init(id: UUID, name: String, trackingRawValue: String, unit: String, dailyTarget: Int?) {
        self.id = id
        self.name = name
        self.trackingRawValue = trackingRawValue
        self.unit = unit
        self.dailyTarget = dailyTarget
    }
}

@Model
final class StoredHabitEntry {
    @Attribute(.unique) var id: UUID
    var habitID: UUID
    var date: Date
    var value: Int

    init(id: UUID, habitID: UUID, date: Date, value: Int) {
        self.id = id
        self.habitID = habitID
        self.date = date
        self.value = value
    }
}
