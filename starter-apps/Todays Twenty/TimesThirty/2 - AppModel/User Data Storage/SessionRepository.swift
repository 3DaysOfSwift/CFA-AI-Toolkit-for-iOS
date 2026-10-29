import Foundation

// One storage seam enables isolated tests. Features remain concrete types.
protocol SessionRepository: Sendable {
    func fetchSessions() async throws -> [PracticeSession]
    func save(_ session: PracticeSession) async throws
}
