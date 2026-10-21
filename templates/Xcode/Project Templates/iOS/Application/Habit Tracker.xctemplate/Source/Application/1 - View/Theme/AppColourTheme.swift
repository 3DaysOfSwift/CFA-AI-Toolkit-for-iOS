import SwiftUI
import UIKit

struct AppColourTheme: Equatable {
    let id: String
    let name: String
    let colorScheme: ColorScheme?
    let background: Color
    let surface: Color
    let primaryText: Color
    let secondaryText: Color
    let tint: Color
    let onTint: Color
    let separator: Color

    static let light = AppColourTheme(
        id: "light", name: "Light", colorScheme: .light,
        background: Color(red: 0.96, green: 0.96, blue: 0.94),
        surface: .white, primaryText: Color(red: 0.12, green: 0.13, blue: 0.13),
        secondaryText: Color(red: 0.40, green: 0.42, blue: 0.42),
        tint: Color(red: 0.18, green: 0.38, blue: 0.32), onTint: .white,
        separator: Color(red: 0.86, green: 0.87, blue: 0.85)
    )

    static let dark = AppColourTheme(
        id: "dark", name: "Dark", colorScheme: .dark,
        background: Color(red: 0.08, green: 0.09, blue: 0.09),
        surface: Color(red: 0.14, green: 0.15, blue: 0.15),
        primaryText: Color(red: 0.94, green: 0.95, blue: 0.93),
        secondaryText: Color(red: 0.66, green: 0.68, blue: 0.66),
        tint: Color(red: 0.58, green: 0.78, blue: 0.68),
        onTint: Color(red: 0.08, green: 0.13, blue: 0.11),
        separator: Color(red: 0.25, green: 0.27, blue: 0.26)
    )

    static let ocean = AppColourTheme(
        id: "ocean", name: "Ocean", colorScheme: .dark,
        background: Color(red: 0.03, green: 0.10, blue: 0.16),
        surface: Color(red: 0.07, green: 0.18, blue: 0.25),
        primaryText: .white, secondaryText: Color(red: 0.68, green: 0.80, blue: 0.87),
        tint: Color(red: 0.35, green: 0.84, blue: 0.82),
        onTint: Color(red: 0.03, green: 0.10, blue: 0.16),
        separator: Color(red: 0.22, green: 0.34, blue: 0.40)
    )

    static let plum = AppColourTheme(
        id: "plum", name: "Plum", colorScheme: .dark,
        background: Color(red: 0.12, green: 0.07, blue: 0.16),
        surface: Color(red: 0.21, green: 0.13, blue: 0.26),
        primaryText: Color(red: 0.98, green: 0.94, blue: 1),
        secondaryText: Color(red: 0.79, green: 0.69, blue: 0.84),
        tint: Color(red: 0.88, green: 0.66, blue: 0.94),
        onTint: Color(red: 0.12, green: 0.07, blue: 0.16),
        separator: Color(red: 0.38, green: 0.27, blue: 0.43)
    )

    static let forest = AppColourTheme(
        id: "forest", name: "Forest", colorScheme: .light,
        background: Color(red: 0.91, green: 0.95, blue: 0.88),
        surface: Color(red: 0.97, green: 0.99, blue: 0.94),
        primaryText: Color(red: 0.12, green: 0.20, blue: 0.10),
        secondaryText: Color(red: 0.30, green: 0.40, blue: 0.27),
        tint: Color(red: 0.22, green: 0.39, blue: 0.16), onTint: .white,
        separator: Color(red: 0.71, green: 0.79, blue: 0.65)
    )

    static let terracotta = AppColourTheme(
        id: "terracotta", name: "Terracotta", colorScheme: .light,
        background: Color(red: 0.98, green: 0.93, blue: 0.87),
        surface: Color(red: 1, green: 0.98, blue: 0.95),
        primaryText: Color(red: 0.24, green: 0.14, blue: 0.10),
        secondaryText: Color(red: 0.46, green: 0.31, blue: 0.25),
        tint: Color(red: 0.64, green: 0.25, blue: 0.15), onTint: .white,
        separator: Color(red: 0.84, green: 0.73, blue: 0.64)
    )

    static let indigo = AppColourTheme(
        id: "indigo", name: "Indigo", colorScheme: .light,
        background: Color(red: 0.93, green: 0.93, blue: 0.99),
        surface: Color(red: 0.98, green: 0.98, blue: 1),
        primaryText: Color(red: 0.14, green: 0.13, blue: 0.28),
        secondaryText: Color(red: 0.37, green: 0.36, blue: 0.51),
        tint: Color(red: 0.33, green: 0.28, blue: 0.67), onTint: .white,
        separator: Color(red: 0.76, green: 0.75, blue: 0.89)
    )

    static let all = [light, dark, ocean, plum, forest, terracotta, indigo]
    static let defaultLight = light
    static let defaultDark = dark

    // Automatic is a selection mode, separate from the seven fixed palettes.
    // Dynamic colours resolve against each presentation's traits without storing
    // a second, potentially stale copy of the system appearance in ThemeManager.
    static let automatic = AppColourTheme(
        id: "automatic", name: "Automatic", colorScheme: nil,
        background: adaptive(defaultLight.background, defaultDark.background),
        surface: adaptive(defaultLight.surface, defaultDark.surface),
        primaryText: adaptive(defaultLight.primaryText, defaultDark.primaryText),
        secondaryText: adaptive(defaultLight.secondaryText, defaultDark.secondaryText),
        tint: adaptive(defaultLight.tint, defaultDark.tint),
        onTint: adaptive(defaultLight.onTint, defaultDark.onTint),
        separator: adaptive(defaultLight.separator, defaultDark.separator)
    )

    static let availableThemes = [automatic] + all

    private static func adaptive(_ light: Color, _ dark: Color) -> Color {
        let lightColour = UIColor(light)
        let darkColour = UIColor(dark)
        return Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? darkColour : lightColour
        })
    }
}
