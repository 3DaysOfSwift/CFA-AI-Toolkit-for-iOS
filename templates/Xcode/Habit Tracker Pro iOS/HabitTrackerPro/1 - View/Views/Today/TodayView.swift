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
                            Text("Add a habit to start tracking your daily progress.")
                        } actions: {
                            Button("Add Habit") { isShowingAddHabit = true }
                                .buttonStyle(.borderedProminent)
                        }
                        .foregroundStyle(theme.secondaryText)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(viewModel.habits) { habit in
                                HabitTodayRow(habit: habit, theme: theme,
                                              amount: Binding(get: { viewModel.amountText(for: habit) },
                                                              set: { viewModel.editAmount($0, for: habit) }),
                                              canIncrement: viewModel.canIncrement(habit),
                                              statusText: viewModel.statusText(for: habit),
                                              needsRetry: viewModel.needsRetry(habit),
                                              onToggle: { viewModel.toggle(habit) },
                                              onIncrement: { viewModel.increment(habit) },
                                              onRetry: viewModel.retrySaving)
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
                            .frame(minWidth: 48, minHeight: 48)
                    }
                    .accessibilityLabel("Add habit")
                    .tint(theme.tint)
                }
            }
            .sheet(isPresented: $isShowingAddHabit) { AddHabitView() }
            .alert("Couldn’t save", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("Retry", action: viewModel.retrySaving)
                Button("Not now", role: .cancel) { viewModel.errorMessage = nil }
            } message: { Text(viewModel.errorMessage ?? "Please try again.") }
        }
        .tint(theme.tint)
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
            Image(systemName: "flame.fill").font(.title2).foregroundStyle(theme.tint)
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
    @Binding var amount: String
    let canIncrement: Bool
    let statusText: String?
    let needsRetry: Bool
    let onToggle: () -> Void
    let onIncrement: () -> Void
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Button(action: onToggle) {
                    Image(systemName: habit.isCompleteToday ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 28))
                        .foregroundStyle(habit.isCompleteToday ? theme.tint : theme.secondaryText)
                        .frame(width: 48, height: 48)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(habit.isCompleteToday ? "Mark \(habit.name) incomplete" : "Complete \(habit.name)")

                VStack(alignment: .leading, spacing: 5) {
                    Text(habit.name).font(.headline).foregroundStyle(theme.primaryText)
                }
                Spacer(minLength: 0)
            }
            if habit.tracking == .count {
                HStack(spacing: 12) {
                    TextField("0", text: $amount)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(theme.primaryText)
                        .frame(minWidth: 64, maxWidth: 110, minHeight: 48)
                        .background(theme.background, in: RoundedRectangle(cornerRadius: 12))
                        .accessibilityLabel("Today's count for \(habit.name)")
                        .accessibilityHint("Changes save automatically")
                    if !habit.unit.isEmpty {
                        Text(habit.unit).font(.subheadline).foregroundStyle(theme.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                    Button(action: onIncrement) {
                        Image(systemName: "plus").font(.title3.weight(.semibold))
                            .frame(width: 48, height: 48)
                            .background(theme.background, in: Circle())
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(theme.tint)
                    .disabled(!canIncrement)
                    .accessibilityLabel("Add one to \(habit.name)")
                }
            }
            if let statusText {
                Text(statusText).font(.caption).foregroundStyle(theme.secondaryText)
            }
            if needsRetry {
                Button("Retry", action: onRetry)
                    .frame(minWidth: 48, minHeight: 48)
                    .buttonStyle(.bordered)
            }
        }
        .padding(16)
        .background(theme.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}
