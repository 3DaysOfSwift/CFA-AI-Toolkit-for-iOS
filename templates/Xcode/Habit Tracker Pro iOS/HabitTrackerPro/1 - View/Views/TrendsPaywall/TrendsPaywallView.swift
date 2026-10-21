import SwiftUI
import Charts

struct TrendsPaywallView: View {
    @State private var viewModel = TrendsPaywallViewModel()
    @Environment(ThemeManager.self) private var themeManager

    private var theme: AppColourTheme { themeManager.selectedTheme }
    // Illustrative artwork only. Never substitutes for a user's paid data.
    private let preview = [2, 4, 3, 5, 4, 6, 7]

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Label("HABIT TRACKER PRO", systemImage: "sparkles")
                .font(.caption.weight(.bold)).tracking(2).foregroundStyle(theme.tint)
            Text("Small habits.\nA bigger picture.")
                .font(.largeTitle.bold()).fixedSize(horizontal: false, vertical: true)
            Text("See how your effort adds up with a one-time Trends unlock.")
                .foregroundStyle(theme.secondaryText)
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Label("Your progress, revealed", systemImage: "chart.xyaxis.line").font(.headline)
                    Spacer()
                    Image(systemName: "lock.fill").foregroundStyle(theme.tint)
                }
                Chart(Array(preview.enumerated()), id: \.offset) { point in
                    BarMark(x: .value("Example day", point.offset), y: .value("Example amount", point.element))
                        .foregroundStyle(theme.tint.gradient).cornerRadius(5)
                }
                .chartXAxis(.hidden).chartYAxis(.hidden).frame(height: 130)
                .accessibilityLabel("Illustrative chart preview, not your activity")
                Text("Illustrative preview · your charts use your own history")
                    .font(.caption).foregroundStyle(theme.secondaryText)
            }
            .padding(20).background(theme.surface, in: RoundedRectangle(cornerRadius: 22))
            Label("Daily activity and target lines", systemImage: "chart.bar")
            Label("Four weeks of completion patterns", systemImage: "calendar")
            Label("Every habit, one permanent unlock", systemImage: "checkmark.seal")
            Button { Task { await viewModel.purchase() } } label: {
                Text(viewModel.purchaseTitle).font(.headline)
                    .foregroundStyle(theme.onTint)
                    .frame(maxWidth: .infinity, minHeight: 52)
            }
            .buttonStyle(.borderedProminent).tint(theme.tint)
            .disabled(!viewModel.canPurchase)
            Text("One-time purchase. No subscription. Your habits and day streaks remain free.")
                .font(.footnote).foregroundStyle(theme.secondaryText)
            if viewModel.isPurchasingOrRestoring || viewModel.isLoadingOffer { ProgressView() }
            if let notice = viewModel.notice { Text(notice).font(.callout) }
            if let error = viewModel.errorMessage {
                Text(error).font(.callout)
                Button("Try again") { Task { await viewModel.retry() } }
                    .frame(minHeight: 48).disabled(viewModel.isPurchasingOrRestoring || viewModel.isLoadingOffer)
            }
            Button("Restore Purchases") { Task { await viewModel.restore() } }
                .frame(maxWidth: .infinity, minHeight: 48).disabled(viewModel.isPurchasingOrRestoring)
        }
        .foregroundStyle(theme.primaryText)
    }
}
