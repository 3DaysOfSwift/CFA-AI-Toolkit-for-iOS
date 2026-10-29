import SwiftUI

struct ContentView: View {
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        TabView {
            Tab("Practice", systemImage: "brain.head.profile") { PracticeView() }
            Tab("Day Streak", systemImage: "flame.fill") { DayStreakView() }
            Tab("Settings", systemImage: "gearshape.fill") { SettingsView() }
        }
        .tint(themeManager.current.tint)
        .preferredColorScheme(themeManager.current.colorScheme)
        .toolbarBackground(.ultraThinMaterial, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}
