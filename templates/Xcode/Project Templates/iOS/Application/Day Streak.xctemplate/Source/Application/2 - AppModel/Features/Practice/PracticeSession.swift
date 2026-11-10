import Foundation

enum Difficulty: String, CaseIterable, Codable, Identifiable, Sendable {
    case gentle, everyday, challenge

    var id: String { rawValue }
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
    let wrongAnswers: Set<Int>
    let isRevealed: Bool
    let isAnswered: Bool
    var answer: Int { left * right }
    var isResolved: Bool { isRevealed || isAnswered }

    init(id: UUID, left: Int, right: Int, choices: [Int], wrongAnswers: Set<Int> = [],
         isRevealed: Bool = false, isAnswered: Bool = false) {
        self.id = id
        self.left = left
        self.right = right
        self.choices = choices
        self.wrongAnswers = wrongAnswers
        self.isRevealed = isRevealed
        self.isAnswered = isAnswered
    }

    func updating(wrongAnswers: Set<Int>? = nil, isRevealed: Bool? = nil,
                  isAnswered: Bool? = nil) -> Self {
        Self(id: id, left: left, right: right, choices: choices,
             wrongAnswers: wrongAnswers ?? self.wrongAnswers,
             isRevealed: isRevealed ?? self.isRevealed,
             isAnswered: isAnswered ?? self.isAnswered)
    }

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
    let difficulty: Difficulty
    let question: MultiplicationQuestion
    let questionNumber: Int
    let correctCount: Int
    let completedAt: Date?
    var isComplete: Bool { completedAt != nil }
    var canChangeDifficulty: Bool { questionNumber == 1 && !isComplete }

    init(id: UUID, day: Date, isExtraPractice: Bool, difficulty: Difficulty,
         question: MultiplicationQuestion, questionNumber: Int = 1,
         correctCount: Int = 0, completedAt: Date? = nil) {
        self.id = id
        self.day = day
        self.isExtraPractice = isExtraPractice
        self.difficulty = difficulty
        self.question = question
        self.questionNumber = questionNumber
        self.correctCount = correctCount
        self.completedAt = completedAt
    }

    func updating(difficulty: Difficulty? = nil, question: MultiplicationQuestion? = nil,
                  questionNumber: Int? = nil, correctCount: Int? = nil,
                  completedAt: Date? = nil) -> Self {
        Self(id: id, day: day, isExtraPractice: isExtraPractice,
             difficulty: difficulty ?? self.difficulty, question: question ?? self.question,
             questionNumber: questionNumber ?? self.questionNumber,
             correctCount: correctCount ?? self.correctCount,
             completedAt: completedAt ?? self.completedAt)
    }
}

enum PracticeError: Error {
    case unavailableSession, staleQuestion, difficultyLocked, unresolvedQuestion
}
