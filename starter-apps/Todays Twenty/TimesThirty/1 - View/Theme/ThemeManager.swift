import SwiftUI

enum ThemeChoice: String, CaseIterable, Identifiable {
    case automatic, daylight, midnight, quiet, ocean, plum, ember, indigo
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var colorScheme: ColorScheme? {
        switch self {
        case .automatic: nil
        case .midnight, .ocean, .plum, .indigo: .dark
        default: .light
        }
    }
}

struct AppColourTheme {
    let background: Color
    let surface: Color
    let tint: Color
    let onTint: Color
    let heroTop: Color
    let heroBottom: Color
    let colorScheme: ColorScheme?
    let success = Color(red: 0.12, green: 0.60, blue: 0.34)
    let error = Color(red: 0.80, green: 0.16, blue: 0.23)

    static func palette(_ choice: ThemeChoice) -> Self {
        let colors: [UInt32]
        switch choice {
        // Trend's original Daylight, Midnight and Quiet visual palettes.
        case .automatic, .daylight: colors = [0xF5F7FC, 0xFFFFFF, 0x00A196, 0x0A1C30, 0x054A61]
        case .midnight: colors = [0x060B16, 0x121A29, 0x3DE6D6, 0x141A3D, 0x0A576B]
        case .quiet: colors = [0xF5F2E8, 0xFEFBF2, 0x4F856E, 0x293833, 0x406657]
        case .ocean: colors = [0x071B26, 0x102F3D, 0x63D9EF, 0x0A283C, 0x12526B]
        case .plum: colors = [0x1D1426, 0x2D203B, 0xD5AEF5, 0x281539, 0x67427C]
        case .ember: colors = [0xFCF3EB, 0xFFFFFF, 0xAA4925, 0x38201A, 0x995031]
        case .indigo: colors = [0x12152D, 0x202644, 0xA8BAFF, 0x141B40, 0x3B5095]
        }
        let mapped = colors.map { Color(hex: $0) }
        let onTint: Color = switch choice {
        case .quiet: .black
        case .automatic, .daylight, .ember: .white
        default: Color(hex: 0x101722)
        }
        return Self(background: mapped[0], surface: mapped[1], tint: mapped[2], onTint: onTint,
                    heroTop: mapped[3], heroBottom: mapped[4], colorScheme: choice.colorScheme)
    }

    static var automatic: Self {
        let light = palette(.daylight)
        let dark = palette(.midnight)
        return Self(background: adaptive(light.background, dark.background),
                    surface: adaptive(light.surface, dark.surface),
                    tint: adaptive(light.tint, dark.tint), onTint: adaptive(light.onTint, dark.onTint),
                    heroTop: adaptive(light.heroTop, dark.heroTop),
                    heroBottom: adaptive(light.heroBottom, dark.heroBottom), colorScheme: nil)
    }

    private static func adaptive(_ light: Color, _ dark: Color) -> Color {
        let lightColor = UIColor(light)
        let darkColor = UIColor(dark)
        return Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? darkColor : lightColor
        })
    }
}

private extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255,
                  green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

@MainActor @Observable
final class ThemeManager {
    private(set) var selectedTheme: ThemeChoice
    private let defaults: UserDefaults
    var current: AppColourTheme {
        selectedTheme == .automatic ? .automatic : .palette(selectedTheme)
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        selectedTheme = ThemeChoice(rawValue: defaults.string(forKey: "selectedTheme") ?? "") ?? .automatic
    }

    func select(_ theme: ThemeChoice) {
        selectedTheme = theme
        defaults.set(theme.rawValue, forKey: "selectedTheme")
    }
}
