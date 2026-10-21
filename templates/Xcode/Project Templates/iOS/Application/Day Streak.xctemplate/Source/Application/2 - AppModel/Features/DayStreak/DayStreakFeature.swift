import Foundation
import Observation

struct StreakDay: Identifiable {
    let date: Date
    let isComplete: Bool
    let isToday: Bool
    var id: Date { date }
}

@MainActor @Observable
final class DayStreakFeature {
    private let practiceFeature: PracticeFeature
    private let calendar: Calendar

    init(practiceFeature: PracticeFeature, calendar: Calendar = .current) {
        self.practiceFeature = practiceFeature
        self.calendar = calendar
    }

    var completedDays: Set<Date> { practiceFeature.completedActivityDays }
    var today: Date { practiceFeature.today }
    var completedDayCount: Int { completedDays.count }
    var correctAnswerCount: Int { practiceFeature.sessions.reduce(0) { $0 + $1.correctCount } }
    var currentStreak: Int { Self.streak(endingNear: today, days: completedDays, calendar: calendar) }
    var longestStreak: Int {
        var previousDate: Date?
        var consecutiveDays = 0
        var longest = 0
        for date in completedDays.sorted() {
            let expectedDate = previousDate.flatMap { calendar.date(byAdding: .day, value: 1, to: $0) }
            consecutiveDays = expectedDate == date ? consecutiveDays + 1 : 1
            longest = max(longest, consecutiveDays)
            previousDate = date
        }
        return longest
    }
    var week: [StreakDay] {
        (-6...0).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: today) else { return nil }
            return StreakDay(date: date, isComplete: completedDays.contains(date), isToday: offset == 0)
        }
    }

    static func streak(endingNear today: Date, days: Set<Date>, calendar: Calendar) -> Int {
        var date = calendar.startOfDay(for: today)
        // An unfinished today does not break yesterday's streak before midnight.
        if !days.contains(date), let yesterday = calendar.date(byAdding: .day, value: -1, to: date) {
            date = yesterday
        }
        var count = 0
        while days.contains(date) {
            count += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: date) else { break }
            date = previous
        }
        return count
    }

    func refresh() async throws { try await practiceFeature.perform(.refresh) }
}
