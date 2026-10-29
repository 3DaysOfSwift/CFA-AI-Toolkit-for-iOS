import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        let theme = themeManager.selectedTheme
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Colour theme", selection: Binding(
                        get: { themeManager.selectedTheme.id },
                        set: { id in
                            if let selected = AppColourTheme.availableThemes.first(where: { $0.id == id }) {
                                themeManager.select(selected)
                            }
                        }
                    )) {
                        ForEach(AppColourTheme.availableThemes, id: \.id) { option in
                            Text(option.name).tag(option.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(minHeight: 48)
                }
                Section("Calendar") {
                    Picker("Week starts", selection: Binding(
                        get: { viewModel.firstWeekday },
                        set: { weekday in
                            viewModel.selectFirstWeekday(weekday)
                        }
                    )) {
                        Text("Monday").tag(2)
                        Text("Sunday").tag(1)
                    }
                }
                Section {
                    LabeledContent("App") {
                        Text(viewModel.appName)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Storage", value: "SwiftData · On this device")
                    LabeledContent("Architecture", value: "CFA iOS Architecture")
                    Text("Built with Cooperative Feature Architecture.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("About")
                } footer: {
                    VStack(spacing: 20) {
                        Text("Build daily habits and celebrate your progress. Habit history is stored on this device.")
                        Text(viewModel.versionDescription)
                    }
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
            }
            .scrollContentBackground(.hidden)
            .background(theme.background)
            .navigationTitle("Settings")
        }
        .tint(theme.tint)
        .preferredColorScheme(theme.colorScheme)
    }
}
