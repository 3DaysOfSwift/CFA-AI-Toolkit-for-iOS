import Testing
@testable import TimesThirty

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
