import SwiftUI

@main
struct ___PACKAGENAMEASIDENTIFIER___App: App {
    @State private var themeManager = ThemeManager(settingsFeature: AppModel.shared.settingsFeature)

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
