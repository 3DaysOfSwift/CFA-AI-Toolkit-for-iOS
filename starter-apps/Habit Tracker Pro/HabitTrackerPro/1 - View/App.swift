import SwiftUI

@MainActor
final class AppLaunchDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        AppModel.shared.applicationDidFinishLaunching()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        AppModel.shared.applicationDidBecomeActive()
    }
}

@main
struct HabitTrackerProApp: App {
    @UIApplicationDelegateAdaptor(AppLaunchDelegate.self) private var launchDelegate
    @State private var themeManager = ThemeManager(settingsFeature: AppModel.shared.settingsFeature)

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
