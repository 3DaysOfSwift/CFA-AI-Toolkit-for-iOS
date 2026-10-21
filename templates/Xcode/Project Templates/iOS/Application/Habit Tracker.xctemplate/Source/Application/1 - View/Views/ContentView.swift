import SwiftUI

struct ContentView: View {
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        let theme = themeManager.current
        TabView {
            Tab("Today", systemImage: "checkmark.circle") { TodayView() }
            Tab("Habits", systemImage: "list.bullet") { HabitsView() }
            Tab("Day Streak", systemImage: "flame") { DayStreakView() }
            Tab("Settings", systemImage: "gearshape") { SettingsView() }
        }
        .tint(theme.accent)
        .preferredColorScheme(theme.scheme)
    }
}
