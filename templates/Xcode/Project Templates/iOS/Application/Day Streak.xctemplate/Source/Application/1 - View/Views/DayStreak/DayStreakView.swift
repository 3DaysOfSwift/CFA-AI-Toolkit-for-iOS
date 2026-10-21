import SwiftUI

struct DayStreakView: View {
    @State private var viewModel = DayStreakViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                StreakStrip(streak: viewModel.currentStreak, days: viewModel.week)
                ScrollView {
                    VStack(spacing: 24) {
                        if let error = viewModel.errorMessage {
                            OperationErrorView(message: error) { viewModel.refresh() }
                        }
                        HeroCard {
                            VStack(spacing: 12) {
                                Image(systemName: "flame.fill").font(.largeTitle).foregroundStyle(.orange)
                                Text("\(viewModel.currentStreak)")
                                    .font(.system(size: 112, weight: .bold, design: .rounded)).monospacedDigit()
                                Text("DAY STREAK").font(.caption.bold()).tracking(2).opacity(0.7)
                                Text(viewModel.currentStreak == 0 ? "Your next chapter starts today." : "Keep showing up for yourself.")
                                    .font(.headline).multilineTextAlignment(.center)
                            }
                        }
                        VStack(spacing: 18) {
                            statistic("Correct answers", value: viewModel.correctAnswerCount, symbol: "checkmark")
                            Divider()
                            statistic("Completed days", value: viewModel.completedDayCount, symbol: "calendar.badge.checkmark")
                            Divider()
                            statistic("Longest streak", value: viewModel.longestStreak, symbol: "flame")
                        }
                        .padding(24).background(themeManager.current.surface, in: RoundedRectangle(cornerRadius: 24))
                        Text("Finish your daily twenty to earn a day. Extra practice sharpens your skills, but never adds a second streak day. Missing a day resets your current streak—not your history.")
                            .font(.subheadline).foregroundStyle(.secondary)
                        if !viewModel.completedDates.isEmpty {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("Your completed days").font(.headline)
                                ForEach(viewModel.completedDates.prefix(30), id: \.self) { date in
                                    HStack {
                                        Text(date, format: .dateTime.day().month(.wide).year())
                                        Spacer()
                                        Image(systemName: "checkmark.circle.fill").foregroundStyle(themeManager.current.success)
                                    }
                                }
                            }
                            .padding(24).background(themeManager.current.surface, in: RoundedRectangle(cornerRadius: 24))
                        }
                    }
                    .padding(20).frame(maxWidth: 650).frame(maxWidth: .infinity)
                }
            }
            .background(themeManager.current.background)
            .navigationTitle("Day Streak").navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.refresh().value }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { viewModel.refresh() }
            }
            .background {
                DayBoundaryObserver { viewModel.refresh() }
            }
        }
    }

    private func statistic(_ title: String, value: Int, symbol: String) -> some View {
        HStack {
            Label(title, systemImage: symbol).font(.subheadline)
            Spacer()
            Text(value.formatted()).font(.title2.bold().monospacedDigit())
        }
    }
}
