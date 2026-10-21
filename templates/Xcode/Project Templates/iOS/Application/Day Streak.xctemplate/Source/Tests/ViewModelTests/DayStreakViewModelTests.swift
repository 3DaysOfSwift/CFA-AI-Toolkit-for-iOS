import Testing
@testable import ___PACKAGENAMEASIDENTIFIER___

@MainActor
struct DayStreakViewModelTests {
    @Test func reflectsCompletionFromCooperatingFeature() async throws {
        let env = TestEnvironment()
        let model = DayStreakViewModel(dayStreakFeature: env.streak)
        await model.refresh().value
        #expect(model.currentStreak == 0)
        try await env.start()
        try await env.finish()
        #expect(model.currentStreak == 1)
        #expect(model.completedDayCount == 1)
        #expect(model.correctAnswerCount == 20)
    }
}
