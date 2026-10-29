import SwiftUI

@MainActor
final class AppLaunchDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Task { await AppModel.shared.applicationDidFinishLaunching() }
        return true
    }
}

@main
struct HabitTrackerTemplateApp: App {
    @UIApplicationDelegateAdaptor(AppLaunchDelegate.self) private var launchDelegate
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
