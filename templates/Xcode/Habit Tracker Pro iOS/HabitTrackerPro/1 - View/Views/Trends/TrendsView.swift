import SwiftUI
import Charts

struct TrendsView: View {
    @State private var viewModel = TrendsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if viewModel.hasAccess {
                        Text("See the bigger picture.")
                            .font(.largeTitle.bold())
                        Text("Your last 30 days, one habit at a time.")
                            .foregroundStyle(themeManager.selectedTheme.secondaryText)
                        if let error = viewModel.loadError {
                            Text(error)
                            Button("Try again") { Task { await viewModel.retry() } }
                                .frame(minHeight: 48)
                        }
                        if viewModel.isLoading { ProgressView("Loading your habits…") }
                        if let trend = viewModel.selectedTrend {
                            Picker("Habit", selection: Binding(
                                get: { viewModel.selectedID }, set: { viewModel.selectedID = $0 }
                            )) {
                                ForEach(viewModel.trends) { habit in
                                    Text(habit.name).tag(Optional(habit.id))
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(minHeight: 48)
                            HabitTrendCharts(trend: trend, theme: themeManager.selectedTheme)
                        } else if !viewModel.isLoading && viewModel.loadError == nil {
                            ContentUnavailableView("Your story starts with a habit",
                                systemImage: "chart.bar", description: Text("Add a habit in Today. Your recorded activity will appear here."))
                        }
                    } else {
                        TrendsPaywallView()
                    }
                }
                .padding(20)
            }
            .foregroundStyle(themeManager.selectedTheme.primaryText)
            .background(themeManager.selectedTheme.background)
            .navigationTitle("Trends")
        }
    }
}

private struct HabitTrendCharts: View {
    let trend: HabitTrend
    let theme: AppColourTheme

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("\(trend.completedDayCount)").font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.tint)
                Text("completed days out of the last 30").foregroundStyle(theme.secondaryText)
            }
            VStack(alignment: .leading, spacing: 16) {
                Text("Daily activity").font(.headline)
                Text(trend.unit.isEmpty ? "Recorded amount" : trend.unit)
                    .font(.subheadline).foregroundStyle(theme.secondaryText)
                Chart {
                    ForEach(trend.days) { day in
                        BarMark(x: .value("Day", day.date, unit: .day), y: .value("Amount", day.value))
                            .foregroundStyle(theme.tint)
                            .accessibilityLabel(day.date.formatted(date: .abbreviated, time: .omitted))
                            .accessibilityValue("\(day.value)")
                    }
                    if let target = trend.dailyTarget {
                        RuleMark(y: .value("Daily target", target))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
                            .foregroundStyle(theme.secondaryText)
                            .annotation(position: .top, alignment: .leading) { Text("Target").font(.caption) }
                    }
                }
                .chartXAxis { AxisMarks(values: .stride(by: .day, count: 7)) }
                .frame(height: 190)
            }
            .padding(18).background(theme.surface, in: RoundedRectangle(cornerRadius: 20))
            VStack(alignment: .leading, spacing: 16) {
                Text("Weekly consistency").font(.headline)
                Text("Completed days in each seven-day window.")
                    .font(.subheadline).foregroundStyle(theme.secondaryText)
                Chart(trend.weeks) { week in
                    BarMark(x: .value("Week starting", week.start, unit: .day),
                            y: .value("Completed days", week.completedDayCount))
                        .foregroundStyle(theme.tint)
                        .cornerRadius(5)
                        .accessibilityLabel("Seven days from \(week.start.formatted(date: .abbreviated, time: .omitted))")
                        .accessibilityValue("\(week.completedDayCount) completed days")
                }
                .chartYScale(domain: 0...7)
                .chartXAxis { AxisMarks(values: trend.weeks.map(\.start)) }
                .frame(height: 180)
                Text("Four rolling weeks ending today. Missing entries count as uncompleted days.")
                    .font(.caption).foregroundStyle(theme.secondaryText)
            }
            .padding(18).background(theme.surface, in: RoundedRectangle(cornerRadius: 20))
        }
    }
}
