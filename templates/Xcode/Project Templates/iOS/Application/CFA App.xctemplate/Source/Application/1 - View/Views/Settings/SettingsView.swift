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
                    LabeledContent("App") {
                        Text(viewModel.appName)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.trailing)
                    }
                        .listRowBackground(palette.surface)
                    LabeledContent("Network", value: "GitHub API")
                        .listRowBackground(palette.surface)
                    LabeledContent("Storage", value: "Local JSON cache")
                        .listRowBackground(palette.surface)
                    LabeledContent("Architecture", value: "CFA iOS Architecture")
                        .listRowBackground(palette.surface)
                    Text("Built with Cooperative Feature Architecture.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .listRowBackground(palette.surface)
                } header: {
                    Text("About")
                } footer: {
                    VStack(spacing: 20) {
                        Text("Explore GitHub repositories, with a local cache for previously loaded results.")
                        VStack(spacing: 4) {
                            Text("Created by")
                            if let websiteURL = viewModel.developerWebsiteURL {
                                Link("3DaysOfSwiftConcurrency.com", destination: websiteURL)
                            }
                        }
                        Text(viewModel.versionDescription)
                    }
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
            }
            .tint(palette.tint)
            .scrollContentBackground(.hidden)
            .background(palette.background)
            .navigationTitle("Settings")
        }
    }

}
