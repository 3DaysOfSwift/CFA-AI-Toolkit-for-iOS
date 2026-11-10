import SwiftUI

struct HeroCard<Content: View>: View {
    @Environment(ThemeManager.self) private var themeManager
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity)
            .padding(24)
            .foregroundStyle(.white)
            .background(LinearGradient(colors: [themeManager.current.heroTop, themeManager.current.heroBottom],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: 30))
            .overlay(RoundedRectangle(cornerRadius: 30).strokeBorder(.white.opacity(0.12)))
            .shadow(color: themeManager.current.tint.opacity(0.15), radius: 24, y: 12)
    }
}
