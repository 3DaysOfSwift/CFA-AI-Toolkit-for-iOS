import SwiftUI

struct ContentView: View {
    @Environment(ThemeManager.self) private var themeManager
    @State private var viewModel = ContentViewModel()

    var body: some View {
        let theme = themeManager.selectedTheme
        TabView(selection: $viewModel.selectedTab) {
            Tab("Today", systemImage: "checkmark.circle", value: ContentViewModel.Tab.today) { TodayView() }
            Tab("Habits", systemImage: "list.bullet", value: ContentViewModel.Tab.habits) { HabitsView() }
            Tab("Day Streak", systemImage: "flame", value: ContentViewModel.Tab.dayStreak) { DayStreakView() }
            Tab("Settings", systemImage: "gearshape", value: ContentViewModel.Tab.settings) { SettingsView() }
        }
        .tint(theme.tint)
        .preferredColorScheme(theme.colorScheme)
    }
}
