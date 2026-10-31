import SwiftUI
import UIKit

@MainActor
final class CFAAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _: UIApplication,
        didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        AppModel.shared.applicationDidFinishLaunching()

        return true
    }
}

@main
struct ___PACKAGENAME:identifier___App: App {
    @UIApplicationDelegateAdaptor(CFAAppDelegate.self) private var appDelegate
    @State private var themeManager = ThemeManager.shared

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(themeManager)
                .preferredColorScheme(themeManager.selectedTheme.colorScheme)
        }
    }
}
