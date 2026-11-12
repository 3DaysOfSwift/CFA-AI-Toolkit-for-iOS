import SwiftUI

struct ContentView: View {
    @State private var viewModel = ContentViewModel()

    var body: some View {
        ContentUnavailableView(
            "Start Building",
            systemImage: "hammer",
            description: Text(viewModel.message)
        )
    }
}
