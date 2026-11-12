import Observation

@MainActor
@Observable
final class ContentViewModel {
    private let appModel: AppModel

    init(appModel: AppModel = .shared) {
        self.appModel = appModel
    }

    var message: String {
        appModel.firstFeatureGuidance
    }
}
