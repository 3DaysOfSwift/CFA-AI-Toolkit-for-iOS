import SwiftUI

struct DayStreakView: View {
    @State private var viewModel = DayStreakViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        let theme = themeManager.selectedTheme
        NavigationStack {
            // Re-evaluate date-based presentation across midnight without a fetch.
            TimelineView(.periodic(from: .now, by: 60)) { _ in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Small steps. Lasting progress.")
                            .font(.title2.bold()).foregroundStyle(theme.primaryText)
                        Text("Each habit has its own streak. Meet its target to complete a day. Today can still count until the day ends.")
                            .foregroundStyle(theme.secondaryText)
                        if let error = viewModel.loadError {
                            Text("Couldn’t load your activity").font(.headline)
                            Text(error)
                            Button("Try again") { Task { await viewModel.retryLoading() } }
                                .frame(minWidth: 48, minHeight: 48)
                                .buttonStyle(.bordered).disabled(viewModel.isLoading)
                        }
                        if viewModel.isLoading { ProgressView("Loading your activity…") }
                        if viewModel.summaries.isEmpty && viewModel.loadError == nil && !viewModel.isLoading {
                            ContentUnavailableView("Your streaks start here", systemImage: "flame",
                                description: Text("Add a habit, then record your progress in Today."))
                        }
                        ForEach(viewModel.summaries) { summary in
                            VStack(alignment: .leading, spacing: 16) {
                                Text(summary.name).font(.headline)
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    Text("\(summary.currentStreak)").font(.system(.largeTitle, design: .rounded).bold())
                                    Text("day streak").foregroundStyle(theme.secondaryText)
                                }
                                .foregroundStyle(theme.tint)
                                HStack {
                                    ForEach(summary.recentDays) { day in
                                        VStack(spacing: 8) {
                                            Text(viewModel.weekday(for: day)).font(.caption)
                                            Image(systemName: day.isComplete ? "checkmark.circle.fill" : "circle")
                                                .font(.title3)
                                                .foregroundStyle(day.isComplete ? theme.tint : theme.secondaryText)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .accessibilityElement(children: .ignore)
                                        .accessibilityLabel(viewModel.accessibilityLabel(for: day))
                                    }
                                }
                                Text("Last 7 days · ending today").font(.caption).foregroundStyle(theme.secondaryText)
                                Text("Longest streak: \(summary.longestStreak) \(summary.longestStreak == 1 ? "day" : "days") · Completed days: \(summary.completedDayCount)")
                                    .font(.subheadline).foregroundStyle(theme.secondaryText)
                            }
                            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
                            .background(theme.surface, in: RoundedRectangle(cornerRadius: 18))
                        }
                    }
                    .foregroundStyle(theme.primaryText).padding(20)
                }
            }
            .background(theme.background)
            .navigationTitle("Day Streak")
        }
        .tint(theme.tint)
    }
}
