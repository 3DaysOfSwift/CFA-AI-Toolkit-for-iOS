import Testing
@testable import ___PROJECTNAME:identifier___

@MainActor
struct DayStreakViewModelTests {
    @Test func reflectsCompletionFromCooperatingFeature() async throws {
        let env = TestEnvironment()
        let viewModel = DayStreakViewModel(dayStreakFeature: env.streak)
        await viewModel.refresh().value
        #expect(viewModel.currentStreak == 0)
        try await env.start()
        try await env.finish()
        #expect(viewModel.currentStreak == 1)
        #expect(viewModel.completedDayCount == 1)
        #expect(viewModel.correctAnswerCount == 20)
        #expect(viewModel.recentCompletedDays == [env.clock.date])
    }

    @Test func presentsLoadingFailureWithoutInfrastructureText() async {
        let env = TestEnvironment()
        let viewModel = DayStreakViewModel(dayStreakFeature: env.streak)
        await env.repository.fail(true)

        await viewModel.refresh().value

        #expect(viewModel.errorMessage == "Your saved activity could not be loaded. Please try again.")
    }
}
