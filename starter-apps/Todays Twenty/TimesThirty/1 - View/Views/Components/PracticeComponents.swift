import SwiftUI

// Disabling a question blocks interaction without dimming its feedback or artwork.
struct PracticeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
    }
}

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

struct HeroCard<Content: View>: View {
    @Environment(ThemeManager.self) private var themeManager
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity)
            .padding(24)
            .foregroundStyle(.white)
            .background(LinearGradient(colors: [themeManager.current.heroTop, themeManager.current.heroBottom],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: 30))
            .overlay(RoundedRectangle(cornerRadius: 30).strokeBorder(.white.opacity(0.12)))
            .shadow(color: themeManager.current.tint.opacity(0.15), radius: 24, y: 12)
    }
}

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

struct PrimaryAction: View {
    let title: String
    let symbol: String
    let action: () -> Void
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 56)
                .padding(.horizontal, 12)
                .foregroundStyle(themeManager.current.onTint)
                .background(themeManager.current.tint, in: RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }
}

struct OperationErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Your progress could not be updated", systemImage: "exclamationmark.triangle")
                .font(.headline)
            Text(message).font(.subheadline)
            Button("Try again", action: retry).frame(minWidth: 100, minHeight: 48)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        .accessibilityElement(children: .contain)
    }
}
