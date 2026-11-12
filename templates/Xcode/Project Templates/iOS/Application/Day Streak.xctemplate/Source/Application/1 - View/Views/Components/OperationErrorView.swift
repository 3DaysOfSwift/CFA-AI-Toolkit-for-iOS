import SwiftUI

struct OperationErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Your progress could not be updated", systemImage: "exclamationmark.triangle")
                .font(.headline)
            Text(message).font(.subheadline)
            Button("Try again", action: retry).frame(minWidth: 100, minHeight: 48)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        .accessibilityElement(children: .contain)
    }
}
