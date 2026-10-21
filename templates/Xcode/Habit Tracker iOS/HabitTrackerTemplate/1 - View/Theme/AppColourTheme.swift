import SwiftUI

struct AppColourTheme: Equatable {
    let id: String
    let name: String
    let scheme: ColorScheme
    let background: Color
    let surface: Color
    let primaryText: Color
    let secondaryText: Color
    let accent: Color
    let onAccent: Color
    let separator: Color

    static let light = AppColourTheme(
        id: "light", name: "Light", scheme: .light,
        background: Color(red: 0.96, green: 0.96, blue: 0.94),
        surface: .white, primaryText: Color(red: 0.12, green: 0.13, blue: 0.13),
        secondaryText: Color(red: 0.40, green: 0.42, blue: 0.42),
        accent: Color(red: 0.18, green: 0.38, blue: 0.32), onAccent: .white,
        separator: Color(red: 0.86, green: 0.87, blue: 0.85)
    )

    static let dark = AppColourTheme(
        id: "dark", name: "Dark", scheme: .dark,
        background: Color(red: 0.08, green: 0.09, blue: 0.09),
        surface: Color(red: 0.14, green: 0.15, blue: 0.15),
        primaryText: Color(red: 0.94, green: 0.95, blue: 0.93),
        secondaryText: Color(red: 0.66, green: 0.68, blue: 0.66),
        accent: Color(red: 0.58, green: 0.78, blue: 0.68),
        onAccent: Color(red: 0.08, green: 0.13, blue: 0.11),
        separator: Color(red: 0.25, green: 0.27, blue: 0.26)
    )

    static let all = [light, dark]
}
