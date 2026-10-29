import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        NavigationStack {
            Form {
                // Explicit setters avoid Swift 6.2.3's code-generation crash for bound actor-isolated methods.
                Section {
                    Picker("Colour theme", selection: Binding(
                        get: { themeManager.selectedTheme },
                        set: { themeManager.select($0) }
                    )) {
                        ForEach(ThemeChoice.allCases) { Text($0.title).tag($0) }
                    }.pickerStyle(.menu).frame(minHeight: 48)
                } header: {
                    Text("Make it yours")
                } footer: {
                    Text("Seven palettes. Automatic follows your device's light or dark appearance.")
                }
                .listRowBackground(themeManager.current.surface)
                Section {
                    Picker("Default difficulty", selection: Binding(
                        get: { viewModel.preferredDifficulty },
                        set: { viewModel.selectDifficulty($0) }
                    )) {
                        ForEach(Difficulty.allCases) { Text($0.title).tag($0) }
                    }.pickerStyle(.menu).frame(minHeight: 48)
                } header: {
                    Text("Your practice")
                } footer: {
                    Text("Applies to your next daily session. You can change difficulty on question one. It locks from question two.")
                }
                .listRowBackground(themeManager.current.surface)
                Section("How it works") {
                    Label("20 correct first tries complete a session", systemImage: "checkmark.circle")
                    Label("Wrong or revealed answers earn no point", systemImage: "eye")
                    Label("One daily session + one extra practice", systemImage: "plus.circle")
                    Label("A new day starts at local midnight", systemImage: "moon")
                }
                .listRowBackground(themeManager.current.surface)
                Section("About") {
                    HStack {
                        Text("App")
                        Spacer()
                        HStack(spacing: 6) {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                Image(systemName: "multiply")
                            }
                            .font(.system(.caption2, design: .rounded, weight: .bold))
                            Text("Todays Twenty")
                                .font(.system(.title3, design: .rounded, weight: .bold))
                        }
                        .foregroundStyle(themeManager.current.tint)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("Todays Twenty")
                    }
                    LabeledContent("Storage", value: "SwiftData · on device")
                    LabeledContent("Architecture", value: "CFA iOS Architecture")
                    Text("Built with Cooperative Feature Architecture.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .listRowBackground(themeManager.current.surface)
                Section {
                    VStack(spacing: 18) {
                        Text("Little questions. Lasting confidence.\nYour practice history stays on this device.")
                        Text(viewModel.version)
                    }
                    .font(.footnote).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }
            }
            .scrollContentBackground(.hidden)
            .background(themeManager.current.background)
            .navigationTitle("Settings").navigationBarTitleDisplayMode(.inline)
        }
    }
}
