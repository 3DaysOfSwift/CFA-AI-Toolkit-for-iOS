import Foundation

@MainActor
final class AppModel {
    static let shared = AppModel()

    let firstFeatureGuidance = "Add the first product feature only when its user journey and ownership are clear."

    private init() {}
}
