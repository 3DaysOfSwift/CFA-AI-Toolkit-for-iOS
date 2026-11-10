import Testing
@testable import ___PROJECTNAME:identifier___

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

    @Test func presentsLoadingFailureWithoutInfrastructureText() async {
        let env = TestEnvironment()
        let model = DayStreakViewModel(dayStreakFeature: env.streak)
        await env.repository.fail(true)

        await model.refresh().value

        #expect(model.errorMessage == "Your saved activity could not be loaded. Please try again.")
    }
}
