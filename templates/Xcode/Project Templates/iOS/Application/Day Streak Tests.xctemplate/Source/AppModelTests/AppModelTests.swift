import Foundation
import Testing
@testable import ___PROJECTNAME:identifier___

@Suite("AppModel composition")
@MainActor
struct AppModelTests {
    @Test func sharedPracticeAndStreakStayIsolatedFromAnotherGraph() async throws {
        let name = "___PROJECTNAME:identifier___Tests.AppModel.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: name))
        let otherName = "\(name).other"
        let otherDefaults = try #require(UserDefaults(suiteName: otherName))
        defer { defaults.removePersistentDomain(forName: name) }
        defer { otherDefaults.removePersistentDomain(forName: otherName) }
        let first = TestEnvironment()
        let second = TestEnvironment()
        let settings = SettingsFeature(defaults: defaults)
        let model = AppModel(practiceFeature: first.practice, dayStreakFeature: first.streak,
                             settingsFeature: settings)
        let other = AppModel(practiceFeature: second.practice, dayStreakFeature: second.streak,
                             settingsFeature: SettingsFeature(defaults: otherDefaults))

        #expect(model.practiceFeature === first.practice)
        #expect(model.dayStreakFeature === first.streak)
        model.applicationDidFinishLaunching()
        model.applicationDidFinishLaunching()
        try await first.start()
        try await first.finish()
        #expect(model.dayStreakFeature.completedDayCount == 1)
        #expect(other.practiceFeature.sessions.isEmpty)
        #expect(other.dayStreakFeature.completedDayCount == 0)
    }
}
