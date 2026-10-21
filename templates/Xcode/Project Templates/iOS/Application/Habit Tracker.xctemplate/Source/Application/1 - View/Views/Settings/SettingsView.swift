import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        let theme = themeManager.current
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Colour theme", selection: Binding(
                        get: { themeManager.current.id },
                        set: { id in
                            if let selected = AppColourTheme.all.first(where: { $0.id == id }) {
                                themeManager.select(selected)
                            }
                        }
                    )) {
                        ForEach(AppColourTheme.all, id: \.id) { option in
                            Text(option.name).tag(option.id)
                        }
                    }
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
                    LabeledContent("Data storage", value: "On this device")
                    LabeledContent("Version", value: viewModel.appVersion)
                }
            }
            .scrollContentBackground(.hidden)
            .background(theme.background)
            .navigationTitle("Settings")
        }
        .tint(theme.accent)
        .preferredColorScheme(theme.scheme)
    }
}
