import SwiftUI

@MainActor
final class AppLaunchDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        AppModel.shared.applicationDidFinishLaunching()
        return true
    }
}

@main
struct ___PACKAGENAMEASIDENTIFIER___App: App {
    @UIApplicationDelegateAdaptor(AppLaunchDelegate.self) private var launchDelegate
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(themeManager)
        }
    }
}
