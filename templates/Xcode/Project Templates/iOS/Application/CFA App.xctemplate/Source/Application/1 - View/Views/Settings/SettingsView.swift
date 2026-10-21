import SwiftUI

struct SettingsView: View {
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var viewModel = SettingsViewModel()

    var body: some View {
        let palette = themeManager.selectedTheme.resolved(for: colorScheme).palette

        NavigationStack {
            List {
                Section("Colour theme") {
                    Picker(
                        "Colour theme",
                        selection: Binding(
                            get: { themeManager.selectedTheme },
                            set: { viewModel.selectTheme($0) }
                        )
                    ) {
                        ForEach(AppColourTheme.allCases) { theme in
                            Text(theme.name).tag(theme)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(minHeight: 48)
                    .listRowBackground(palette.surface)
                }

                Section {
                    LabeledContent("Architecture", value: "CFA • Cooperative Feature Architecture")
                        .listRowBackground(palette.surface)
                    LabeledContent("Network", value: "GitHub API")
                        .listRowBackground(palette.surface)
                    LabeledContent("Storage", value: "JSON file cache")
                        .listRowBackground(palette.surface)
                } header: {
                    Text("Technology Stack")
                } footer: {
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Text("Created by")
                            if let websiteURL = viewModel.developerWebsiteURL {
                                Link("3DaysOfSwiftConcurrency.com", destination: websiteURL)
                            }
                        }
                        Text(viewModel.versionDescription)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                }
            }
            .tint(palette.tint)
            .scrollContentBackground(.hidden)
            .background(palette.background)
            .navigationTitle("Settings")
        }
    }

}
