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

    var id: String { rawValue }
}
