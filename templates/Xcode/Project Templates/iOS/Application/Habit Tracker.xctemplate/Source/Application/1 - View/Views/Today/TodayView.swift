import SwiftUI

struct TodayView: View {
    @State private var viewModel = TodayViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @State private var isShowingAddHabit = false

    private var theme: AppColourTheme { themeManager.current }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    if !viewModel.habits.isEmpty || (viewModel.loadError == nil && !viewModel.isLoading) {
                        progressCard
                    }
                    if let loadError = viewModel.loadError {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Couldn’t load your habits").font(.headline)
                            Text(loadError)
                            Button("Try again") { Task { await viewModel.retryLoading() } }
                                .disabled(viewModel.isLoading)
                        }
                        .foregroundStyle(theme.primaryText)
                    }
                    if viewModel.isLoading {
                        ProgressView("Loading your habits…")
                    }
                    if viewModel.habits.isEmpty && viewModel.loadError == nil && !viewModel.isLoading {
                        ContentUnavailableView {
                            Label("No habits yet", systemImage: "circle.dashed")
                        } description: {
                            Text("Add a habit to start building your daily streak.")
                        } actions: {
                            Button("Add Habit") { isShowingAddHabit = true }
                                .buttonStyle(.borderedProminent)
                        }
                        .foregroundStyle(theme.secondaryText)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.habits) { habit in
                                HabitTodayRow(habit: habit, theme: theme, isRecording: viewModel.isRecording,
                                              onToggle: { viewModel.toggle(habit) },
                                              onRecord: { value in viewModel.record(habit, value: value) })
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) { Text("Today").font(.headline).foregroundStyle(theme.primaryText) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { isShowingAddHabit = true } label: {
                        Image(systemName: "plus").font(.headline)
                    }
                    .accessibilityLabel("Add habit")
                    .tint(theme.accent)
                }
            }
            .sheet(isPresented: $isShowingAddHabit) { AddHabitView() }
            .alert("Couldn’t save", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { viewModel.errorMessage = nil }
            } message: { Text(viewModel.errorMessage ?? "Please try again.") }
        }
        .tint(theme.accent)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(viewModel.todayHeading)
                .font(.subheadline).foregroundStyle(theme.secondaryText)
            Text("Your day, one habit at a time")
                .font(.largeTitle.weight(.bold)).foregroundStyle(theme.primaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var progressCard: some View {
        HStack(spacing: 16) {
            Image(systemName: "flame.fill").font(.title2).foregroundStyle(theme.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text("\(viewModel.completedCount) of \(viewModel.habits.count) done")
                    .font(.headline).foregroundStyle(theme.primaryText)
                Text(viewModel.habits.isEmpty ? "Start with one small habit" : "Keep your promises to yourself")
                    .font(.subheadline).foregroundStyle(theme.secondaryText)
            }
            Spacer(minLength: 0)
        }
        .padding(18)
        .background(theme.surface, in: RoundedRectangle(cornerRadius: 18))
    }
}

private struct HabitTodayRow: View {
    let habit: Habit
    let theme: AppColourTheme
    let isRecording: Bool
    let onToggle: () -> Void
    let onRecord: (Int) -> Void
    @State private var amount = ""

    var body: some View {
        HStack(spacing: 14) {
            Button(action: onToggle) {
                Image(systemName: habit.isCompleteToday ? "checkmark.circle.fill" : "circle")
                    .font(.title2).foregroundStyle(habit.isCompleteToday ? theme.accent : theme.secondaryText)
            }
            .buttonStyle(.plain)
            .disabled(isRecording)
            .accessibilityLabel(habit.isCompleteToday ? "Mark \(habit.name) incomplete" : "Complete \(habit.name)")

            VStack(alignment: .leading, spacing: 5) {
                Text(habit.name).font(.headline).foregroundStyle(theme.primaryText)
                Text("\(habit.currentStreak()) day streak")
                    .font(.caption).foregroundStyle(theme.secondaryText)
            }
            Spacer(minLength: 8)
            if habit.tracking == .count {
                HStack(spacing: 6) {
                    TextField("0", text: $amount)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 48)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(theme.primaryText)
                        .onSubmit(saveAmount)
                    if !habit.unit.isEmpty { Text(habit.unit).font(.caption).foregroundStyle(theme.secondaryText) }
                    Button("Save", action: saveAmount)
                        .font(.caption.weight(.semibold))
                    Button {
                        onRecord(max(0, habit.todayValue) + 1)
                    } label: {
                        Image(systemName: "plus").font(.caption.weight(.bold))
                            .padding(8).background(theme.background, in: Circle())
                    }
                    .accessibilityLabel("Add one to \(habit.name)")
                }
            }
        }
        .padding(16)
        .background(theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .disabled(isRecording)
        .onAppear { amount = String(habit.todayValue) }
        .onChange(of: habit.todayValue) { _, value in amount = String(value) }
    }

    private func saveAmount() {
        guard let value = Int(amount), value >= 0 else { return }
        onRecord(value)
    }
}
