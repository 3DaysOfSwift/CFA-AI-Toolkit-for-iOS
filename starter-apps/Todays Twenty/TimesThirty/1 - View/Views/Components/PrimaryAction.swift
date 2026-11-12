import SwiftUI

struct PrimaryAction: View {
    let title: String
    let symbol: String
    let action: () -> Void
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 56)
                .padding(.horizontal, 12)
                .foregroundStyle(themeManager.current.onTint)
                .background(themeManager.current.tint, in: RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }
}
