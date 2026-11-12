import SwiftUI

// Disabling a question blocks interaction without dimming its feedback or artwork.
struct PracticeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
    }
}
