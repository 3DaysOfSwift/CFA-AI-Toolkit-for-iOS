import Foundation

enum AppColourTheme: String, CaseIterable, Identifiable {
    case automatic
    case ocean
    case graphite
    case midnight
    case systemGrey
    case forest
    case terracotta
    case lavender

    static let palettes: [AppColourTheme] = allCases.filter { $0 != .automatic }
    static let defaultLight: AppColourTheme = .systemGrey
    static let defaultDark: AppColourTheme = .ocean

    var id: String { rawValue }

    var name: String {
        switch self {
        case .automatic: "Automatic"
        case .ocean: "Ocean"
        case .graphite: "Graphite"
        case .midnight: "Midnight"
        case .systemGrey: "System Grey"
        case .forest: "Forest"
        case .terracotta: "Terracotta"
        case .lavender: "Lavender"
        }
    }

}
