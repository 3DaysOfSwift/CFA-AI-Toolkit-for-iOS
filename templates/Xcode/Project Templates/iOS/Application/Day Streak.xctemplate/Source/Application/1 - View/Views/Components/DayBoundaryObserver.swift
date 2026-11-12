import Foundation
import SwiftUI

private struct LocalDaySchedule: TimelineSchedule {
    func entries(from startDate: Date, mode: Mode) -> AnySequence<Date> {
        let calendar = Calendar.current
        return AnySequence(sequence(first: startDate) { date in
            calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: date))
        })
    }
}

struct DayBoundaryObserver: View {
    let refresh: () -> Void

    var body: some View {
        // Wake at local midnight, not once per second throughout the day.
        TimelineView(LocalDaySchedule()) { context in
            Color.clear.onChange(of: context.date) { refresh() }
        }
        .accessibilityHidden(true)
    }
}
