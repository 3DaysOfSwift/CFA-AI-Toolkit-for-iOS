import SwiftUI

struct ContentView: View {
    @Environment(ThemeManager.self) private var themeManager
    @State private var viewModel = ContentViewModel()

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            Tab("Practice", systemImage: "brain.head.profile", value: ContentViewModel.Tab.practice) { PracticeView() }
            Tab("Day Streak", systemImage: "flame.fill", value: ContentViewModel.Tab.dayStreak) { DayStreakView() }
            Tab("Settings", systemImage: "gearshape.fill", value: ContentViewModel.Tab.settings) { SettingsView() }
        }
        .tint(themeManager.current.tint)
        .preferredColorScheme(themeManager.current.colorScheme)
        .toolbarBackground(.ultraThinMaterial, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}
