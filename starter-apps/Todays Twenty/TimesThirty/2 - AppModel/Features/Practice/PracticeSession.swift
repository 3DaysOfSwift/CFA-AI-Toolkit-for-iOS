import Foundation

enum Difficulty: String, CaseIterable, Codable, Identifiable, Sendable {
    case gentle, everyday, challenge

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var detail: String {
        switch self {
        case .gentle: "2–5 times tables"
        case .everyday: "2–12 times tables"
        case .challenge: "6–19 times tables"
        }
    }
    var factors: ClosedRange<Int> {
        switch self {
        case .gentle: 2...5
        case .everyday: 2...12
        case .challenge: 6...19
        }
    }
}

struct MultiplicationQuestion: Codable, Equatable, Sendable, Identifiable {
    let id: UUID
    let left: Int
    let right: Int
    let choices: [Int]
    var wrongAnswers: Set<Int> = []
    var isRevealed = false
    var isAnswered = false
    var answer: Int { left * right }
    var isResolved: Bool { isRevealed || isAnswered }

    static func random(difficulty: Difficulty) -> Self {
        let left = Int.random(in: difficulty.factors)
        let right = Int.random(in: difficulty == .gentle ? 2...10 : difficulty.factors)
        let answer = left * right
        var options: Set<Int> = [answer]
        // Nearby products and offsets make plausible distractors, always unique.
        for candidate in [answer - left, answer + left, answer - right, answer + right,
                          answer - 1, answer + 1] where candidate > 0 {
            options.insert(candidate)
        }
        while options.count < 9 {
            options.insert(Int.random(in: max(1, answer - 25)...(answer + 25)))
        }
        return Self(id: UUID(), left: left, right: right, choices: options.shuffled())
    }
}

struct PracticeSession: Codable, Equatable, Identifiable, Sendable {
    static let target = 20
    let id: UUID
    let day: Date
    let isExtraPractice: Bool
    var difficulty: Difficulty
    var question: MultiplicationQuestion
    var questionNumber = 1
    var correctCount = 0
    var completedAt: Date?
    var isComplete: Bool { completedAt != nil }
    var canChangeDifficulty: Bool { questionNumber == 1 && !isComplete }
}

enum PracticeError: LocalizedError {
    case unavailableSession, staleQuestion, difficultyLocked, unresolvedQuestion

    var errorDescription: String? {
        switch self {
        case .unavailableSession: "This session is no longer available. Refresh to see today's practice."
        case .staleQuestion: "The question has changed. Please answer the question now on screen."
        case .difficultyLocked: "Difficulty is fixed after the first question."
        case .unresolvedQuestion: "Find or reveal the correct answer before continuing."
        }
    }
}
