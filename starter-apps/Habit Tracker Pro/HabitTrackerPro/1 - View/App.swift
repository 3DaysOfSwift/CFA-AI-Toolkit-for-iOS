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
        // Let this app-wide refresh finish independently; it has no screen to cancel it.
        // PurchasesFeature prevents an older refresh from publishing over a newer one.
        Task { await AppModel.shared.applicationDidBecomeActive() }
    }
}

@main
struct HabitTrackerProApp: App {
    @UIApplicationDelegateAdaptor(AppLaunchDelegate.self) private var launchDelegate
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
