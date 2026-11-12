import Foundation

struct AppInformation: Equatable, Sendable {
    let appName: String
    let versionDescription: String

    init(appName: String = "App",
         marketingVersion: String? = nil,
         buildNumber: String? = nil) {
        self.appName = Self.nonblank(appName) ?? "App"
        versionDescription = "Version \(Self.nonblank(marketingVersion) ?? "—") " +
            "(\(Self.nonblank(buildNumber) ?? "—"))"
    }

    static var current: AppInformation {
        let bundleInformation = Bundle.main.infoDictionary ?? [:]
        let displayName = nonblank(bundleInformation["CFBundleDisplayName"] as? String)
        let bundleName = nonblank(bundleInformation["CFBundleName"] as? String)

        return AppInformation(
            appName: displayName ?? bundleName ?? "App",
            marketingVersion: bundleInformation["CFBundleShortVersionString"] as? String,
            buildNumber: bundleInformation["CFBundleVersion"] as? String
        )
    }

    private static func nonblank(_ text: String?) -> String? {
        guard let text,
              !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return text
    }
}
