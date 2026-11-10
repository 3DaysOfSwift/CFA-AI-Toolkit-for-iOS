import SwiftUI

struct StreakStrip: View {
    let streak: Int
    let days: [StreakDay]
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 4) {
                Image(systemName: "flame.fill")
                Text("\(streak)")
                    .monospacedDigit()
            }
            .font(.headline).foregroundStyle(.orange)
            .fixedSize(horizontal: true, vertical: false)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(streak) day streak")
            Divider().frame(height: 32)
            ForEach(days) { day in
                VStack(spacing: 5) {
                    Text(day.date, format: .dateTime.weekday(.narrow))
                        .font(.caption2).foregroundStyle(.secondary)
                    Image(systemName: day.isComplete ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(day.isComplete ? themeManager.current.success :
                                            day.isToday ? themeManager.current.tint : .secondary.opacity(0.3))
                }
                .frame(maxWidth: .infinity)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(day.date.formatted(date: .abbreviated, time: .omitted)): \(day.isComplete ? "complete" : "not complete")")
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }
}
