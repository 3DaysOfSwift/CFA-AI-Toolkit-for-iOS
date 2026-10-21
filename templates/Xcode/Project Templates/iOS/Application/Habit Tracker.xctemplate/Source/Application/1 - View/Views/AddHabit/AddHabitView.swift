import SwiftUI

struct AddHabitView: View {
    @State private var viewModel = AddHabitViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let theme = themeManager.current
        NavigationStack {
            Form {
                Section("Habit") {
                    TextField("Name, for example Running", text: $viewModel.name)
                    Picker("Tracking", selection: $viewModel.tracking) {
                        Text("Complete each day").tag(HabitTracking.completion)
                        Text("Count an amount").tag(HabitTracking.count)
                    }
                    if viewModel.tracking == .count {
                        TextField("Unit, for example pull-ups", text: $viewModel.unit)
                        TextField("Daily target (optional)", text: $viewModel.target)
                            .keyboardType(.numberPad)
                    }
                }
                Section {
                    Text("You can change today’s progress from the Today tab. Your history stays on this device.")
                        .font(.footnote).foregroundStyle(theme.secondaryText)
                }
            }
            .scrollContentBackground(.hidden)
            .background(theme.background)
            .navigationTitle("New Habit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { viewModel.save() }
                        .disabled(viewModel.isSaving)
                }
            }
            .alert("Can’t add habit", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { viewModel.errorMessage = nil }
            } message: { Text(viewModel.errorMessage ?? "Please try again.") }
            .onChange(of: viewModel.didSave) { _, didSave in
                if didSave { dismiss() }
            }
        }
        .tint(theme.accent)
        .preferredColorScheme(theme.scheme)
    }
}
