import SwiftUI

extension AppColourTheme {
    var colorScheme: ColorScheme? {
        switch self {
        case .automatic: nil
        case .ocean: .dark
        case .graphite: .dark
        case .midnight: .dark
        case .systemGrey: .light
        case .forest, .terracotta, .lavender: .light
        }
    }

    func resolved(for colorScheme: ColorScheme) -> AppColourTheme {
        switch self {
        case .automatic:
            colorScheme == .dark ? Self.defaultDark : Self.defaultLight
        default:
            self
        }
    }

    var palette: ThemePalette {
        switch self {
        case .automatic:
            AppColourTheme.systemGrey.palette
        case .ocean:
            ThemePalette(
                background: Color(red: 0.04, green: 0.10, blue: 0.16),
                surface: Color(red: 0.08, green: 0.19, blue: 0.28),
                primaryText: .white,
                secondaryText: Color(red: 0.68, green: 0.80, blue: 0.88),
                tint: Color(red: 0.35, green: 0.84, blue: 0.82)
            )
        case .graphite:
            ThemePalette(
                background: Color(red: 0.08, green: 0.08, blue: 0.10),
                surface: Color(red: 0.16, green: 0.16, blue: 0.19),
                primaryText: Color(red: 0.95, green: 0.95, blue: 0.97),
                secondaryText: Color(red: 0.67, green: 0.67, blue: 0.72),
                tint: Color(red: 0.86, green: 0.70, blue: 0.28)
            )
        case .midnight:
            ThemePalette(
                background: Color(red: 0.03, green: 0.05, blue: 0.14),
                surface: Color(red: 0.08, green: 0.12, blue: 0.27),
                primaryText: Color(red: 0.94, green: 0.96, blue: 1.00),
                secondaryText: Color(red: 0.61, green: 0.69, blue: 0.88),
                tint: Color(red: 0.38, green: 0.58, blue: 1.00)
            )
        case .systemGrey:
            ThemePalette(
                background: Color(uiColor: .systemGroupedBackground),
                surface: Color(uiColor: .secondarySystemGroupedBackground),
                primaryText: Color(uiColor: .label),
                secondaryText: Color(uiColor: .secondaryLabel),
                tint: Color(uiColor: .systemBlue)
            )
        case .forest:
            ThemePalette(
                background: Color(red: 0.91, green: 0.95, blue: 0.88),
                surface: Color(red: 0.97, green: 0.99, blue: 0.94),
                primaryText: Color(red: 0.12, green: 0.20, blue: 0.10),
                secondaryText: Color(red: 0.30, green: 0.40, blue: 0.27),
                tint: Color(red: 0.22, green: 0.39, blue: 0.16)
            )
        case .terracotta:
            ThemePalette(
                background: Color(red: 0.98, green: 0.93, blue: 0.87),
                surface: Color(red: 1, green: 0.98, blue: 0.95),
                primaryText: Color(red: 0.24, green: 0.14, blue: 0.10),
                secondaryText: Color(red: 0.46, green: 0.31, blue: 0.25),
                tint: Color(red: 0.64, green: 0.25, blue: 0.15)
            )
        case .lavender:
            ThemePalette(
                background: Color(red: 0.93, green: 0.93, blue: 0.99),
                surface: Color(red: 0.98, green: 0.98, blue: 1),
                primaryText: Color(red: 0.14, green: 0.13, blue: 0.28),
                secondaryText: Color(red: 0.37, green: 0.36, blue: 0.51),
                tint: Color(red: 0.33, green: 0.28, blue: 0.67)
            )
        }
    }
}

struct ThemePalette {
    let background: Color
    let surface: Color
    let primaryText: Color
    let secondaryText: Color
    let tint: Color
}
