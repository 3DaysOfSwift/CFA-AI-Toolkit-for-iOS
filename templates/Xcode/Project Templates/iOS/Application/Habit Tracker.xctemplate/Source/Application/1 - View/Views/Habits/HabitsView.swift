import SwiftUI

struct HabitsView: View {
    @State private var viewModel = HabitsViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @State private var isShowingAddHabit = false

    var body: some View {
        let theme = themeManager.current
        NavigationStack {
            List {
                Section {
                    Text(viewModel.habitCountSummary)
                        .font(.subheadline)
                        .foregroundStyle(theme.secondaryText)
                        .listRowBackground(theme.background)
                }
                ForEach(viewModel.habits) { habit in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(habit.name).font(.headline).foregroundStyle(theme.primaryText)
                            Text(description(for: habit)).font(.subheadline).foregroundStyle(theme.secondaryText)
                        }
                        Spacer()
                        Label("\(habit.currentStreak())", systemImage: "flame.fill")
                            .font(.subheadline.weight(.semibold)).foregroundStyle(theme.accent)
                    }
                    .listRowBackground(theme.surface)
                }
            }
            .scrollContentBackground(.hidden)
            .background(theme.background)
            .overlay {
                if let loadError = viewModel.loadError {
                    ContentUnavailableView {
                        Label("Couldn’t load your habits", systemImage: "externaldrive.badge.exclamationmark")
                    } description: {
                        Text(loadError)
                    } actions: {
                        Button("Try again") { Task { await viewModel.retryLoading() } }
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading your habits…")
                } else if viewModel.habits.isEmpty {
                    ContentUnavailableView("Your habits live here", systemImage: "list.bullet", description: Text("Add your first daily habit."))
                        .foregroundStyle(theme.secondaryText)
                }
            }
            .navigationTitle("Habits")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { isShowingAddHabit = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Add habit")
                }
            }
            .sheet(isPresented: $isShowingAddHabit) { AddHabitView() }
        }
        .tint(theme.accent)
    }

    private func description(for habit: Habit) -> String {
        if habit.tracking == .count {
            let target = habit.dailyTarget.map { " · target \($0)" } ?? ""
            return "Count\(habit.unit.isEmpty ? "" : " in \(habit.unit)")\(target)"
        }
        return habit.dailyTarget.map { "Daily target: \($0)" } ?? "Daily completion"
    }
}
