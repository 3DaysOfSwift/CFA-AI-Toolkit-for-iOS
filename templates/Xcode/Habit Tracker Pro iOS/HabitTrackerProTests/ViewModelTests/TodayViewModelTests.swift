import Foundation
import Testing

@testable import HabitTrackerPro

@Suite("Today screen", .timeLimit(.minutes(1)))
@MainActor
struct TodayViewModelTests {
    @Test("Shows today's completion count")
    func completionCount() async {
        let repository = InMemoryHabitsRepository(habits: [
            Habit(id: UUID(), name: "Run", tracking: .completion, unit: "", dailyTarget: nil,
                  entries: [HabitEntry(id: UUID(), date: .now, value: 1)]),
            Habit(id: UUID(), name: "Read", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        ])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))

        #expect(viewModel.completedCount == 1)
    }

    @Test("Completing a habit records today's value through the feature")
    func completionRoutesToFeature() async {
        let habit = Habit(id: UUID(), name: "Run", tracking: .completion, unit: "", dailyTarget: nil, entries: [])
        let repository = InMemoryHabitsRepository(habits: [habit])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))

        viewModel.toggle(habit)
        let result = await repository.waitForRecord()

        #expect(result.0 == habit.id)
        #expect(result.1 == 1)
    }

    @Test("Inline count edits save without a separate Save action")
    func autosavesCount() async {
        let habit = countHabit()
        let repository = CountEditingRepository(habits: [habit])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))

        viewModel.editAmount("14", for: habit)
        await viewModel.waitForPendingSaves()

        #expect(feature.habits.first?.todayValue == 14)
        #expect(await repository.recordedValues == [14])
        #expect(viewModel.statusText(for: habit) == nil)
        viewModel.increment(habit)
        await viewModel.waitForPendingSaves()
        #expect(feature.habits.first?.todayValue == 15)
    }

    @Test("Typing during a suspended save preserves the latest edit")
    func overlappingEdits() async {
        let habit = countHabit()
        let repository = CountEditingRepository(habits: [habit], holdsFirstWrite: true)
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))

        viewModel.editAmount("1", for: habit)
        await repository.waitForFirstWrite()
        // Autosave must not introduce a status row, loading state or premature
        // completion while the user's inline controls remain available.
        #expect(viewModel.statusText(for: habit) == nil)
        #expect(!viewModel.isLoading)
        #expect(viewModel.completedCount == 0)
        #expect(viewModel.canIncrement(habit))
        #expect(viewModel.errorMessage == nil)
        #expect(!viewModel.needsRetry(habit))
        viewModel.editAmount("14", for: habit)
        viewModel.increment(habit)
        viewModel.increment(habit)
        #expect(viewModel.amountText(for: habit) == "16")
        #expect(viewModel.isSaving(habit))
        #expect(viewModel.statusText(for: habit) == nil)
        await repository.releaseFirstWrite()
        await viewModel.waitForPendingSaves()

        #expect(await repository.recordedValues == [1, 16])
        #expect(feature.habits.first?.todayValue == 16)
        #expect(viewModel.amountText(for: habit) == "16")
        #expect(!viewModel.isRecording)
    }

    @Test("Failed autosave keeps the draft and retries without changing confirmed progress")
    func failedEditAndRetry() async {
        let habit = countHabit()
        let repository = CountEditingRepository(habits: [habit], failsWrites: true)
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))

        viewModel.editAmount("14", for: habit)
        await viewModel.waitForPendingSaves()
        #expect(feature.habits.first?.todayValue == 0)
        #expect(viewModel.amountText(for: habit) == "14")
        #expect(viewModel.errorMessage != nil)
        #expect(viewModel.needsRetry(habit))

        await repository.allowWrites()
        viewModel.retrySaving()
        await viewModel.waitForPendingSaves()
        #expect(feature.habits.first?.todayValue == 14)
        #expect(viewModel.errorMessage == nil)
        #expect(!viewModel.needsRetry(habit))
    }

    @Test("Empty, invalid and overflowing drafts never overwrite stored counts")
    func invalidInput() async {
        let habit = countHabit()
        let repository = CountEditingRepository(habits: [habit])
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))
        viewModel.editAmount("14", for: habit)
        await viewModel.waitForPendingSaves()

        for text in ["", "-1", "abc", "1.5", String(Int.max) + "0"] {
            viewModel.editAmount(text, for: habit)
            await viewModel.waitForPendingSaves()
            #expect(viewModel.amountText(for: habit) == text)
            #expect(viewModel.statusText(for: habit) != nil)
            #expect(!viewModel.canIncrement(habit))
            #expect(feature.habits.first?.todayValue == 14)
        }
        #expect(await repository.recordedValues == [14])
        viewModel.editAmount(String(Int.max), for: habit)
        viewModel.increment(habit)
        await viewModel.waitForPendingSaves()
        #expect(!viewModel.canIncrement(habit))
        #expect(feature.habits.first?.todayValue == Int.max)
        viewModel.editAmount("0", for: habit)
        await viewModel.waitForPendingSaves()
        #expect(feature.habits.first?.todayValue == 0)
    }

    @Test("Edits to another habit are retained while a save is suspended")
    func multipleHabits() async {
        let first = countHabit()
        let second = countHabit()
        let repository = CountEditingRepository(habits: [first, second], holdsFirstWrite: true)
        let feature = HabitsFeature(repository: repository)
        await feature.reload()
        let viewModel = TodayViewModel(todayFeature: TodayFeature(habitsFeature: feature))
        viewModel.editAmount("3", for: first)
        await repository.waitForFirstWrite()
        viewModel.editAmount("8", for: second)
        await repository.releaseFirstWrite()
        await viewModel.waitForPendingSaves()
        #expect(feature.habits.map(\.todayValue) == [3, 8])
    }

    private func countHabit() -> Habit {
        Habit(id: UUID(), name: "Pull ups", tracking: .count, unit: "reps", dailyTarget: 20, entries: [])
    }
}

private actor CountEditingRepository: HabitsRepository {
    private let habits: [Habit]
    private var holdsFirstWrite: Bool
    private var failsWrites: Bool
    private var firstWriteStarted = false
    private var startWaiter: CheckedContinuation<Void, Never>?
    private var writeGate: CheckedContinuation<Void, Never>?
    private(set) var recordedValues: [Int] = []

    init(habits: [Habit], holdsFirstWrite: Bool = false, failsWrites: Bool = false) {
        self.habits = habits
        self.holdsFirstWrite = holdsFirstWrite
        self.failsWrites = failsWrites
    }

    func fetchHabits() async throws -> [Habit] { habits }
    func insertHabit(_ habit: Habit) async throws {}

    func record(habitID: UUID, date: Date, value: Int) async throws {
        if holdsFirstWrite {
            holdsFirstWrite = false
            firstWriteStarted = true
            startWaiter?.resume()
            startWaiter = nil
            await withCheckedContinuation { writeGate = $0 }
        }
        if failsWrites { throw CocoaError(.fileWriteNoPermission) }
        recordedValues.append(value)
    }

    func waitForFirstWrite() async {
        if firstWriteStarted { return }
        await withCheckedContinuation { startWaiter = $0 }
    }

    func releaseFirstWrite() {
        writeGate?.resume()
        writeGate = nil
    }

    func allowWrites() { failsWrites = false }
}
