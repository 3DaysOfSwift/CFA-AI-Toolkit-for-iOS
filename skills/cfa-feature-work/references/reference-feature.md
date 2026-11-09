# Reference feature: recording a note

This complete feature slice follows the path from a screen through its dedicated
ViewModel, Feature and JSON persistence service. The screen ViewModel owns the
unsaved text. The Feature queues admitted saves in order, persists each note
before publication, and continues owned work if the awaiting caller is cancelled.
The caller still awaits the admitted save’s outcome. A failed save leaves the
editor open with its text available for retry. Cancel
closes the editor without saving. During a save, the editor disables text
entry, Save, Cancel and interactive sheet dismissal.

The code below is also available as [NotesReference.swift](spec/examples/NotesReference.swift).
The accompanying [executable checks](spec/examples/NotesReferenceTests.swift)
verify failure recovery, publication after persistence, repeated Save taps,
ordered independent saves, JSON storage and fresh editor state. A queued
save still completes when its predecessor fails, and each caller receives
its own outcome. The checks also verify that two callers share one load
and one caller's cancellation leaves the other able to receive the result.
Saving during initial restoration preserves both the restored and new notes.
The repository accepts one new note at a time. It reads the current file and
atomically rewrites it within one actor turn, so callers never submit their
own copy of the collection. The checks reopen the file after overlapping
inserts and verify that both new notes and the existing note survived.
This example uses a single repository instance for the file.
When the JSON file is corrupt, the checks verify that a failed save preserves the file
and draft. After a valid file is restored, retrying through the same Feature
reloads the saved notes and keeps the draft. A fixed synthetic JSON fixture
also verifies that an existing note survives opening, appending a note, and
reopening the store. For a shipped app, use a disposable store written by the
actual previous implementation to verify an upgrade. Run the checks on macOS
with Xcode and Swift 6:

```sh
xcrun swiftc -swift-version 6 -parse-as-library NotesReference.swift NotesReferenceTests.swift -o /tmp/cfa-notes-tests
/tmp/cfa-notes-tests
```

Run from the folder containing both files. The checks do not simulate SwiftUI
navigation or a device. The example provides a composable editor and AppModel;
to use it as an app, place the types in their CFA folders and supply the app's
normal scene and lifecycle wiring. For a complete Xcode project, see the
[project examples](spec/examples/open-source-apps.md). The full toolkit includes
the starter apps. A standalone skill includes this runnable feature slice.

```swift
import Foundation
import Observation
import SwiftUI

// A note is a snapshot of a successfully saved value.
struct Note: Identifiable, Codable, Sendable, Equatable {
    let id: UUID
    let text: String
}

protocol NotesRepository: Sendable {
    func load() async throws -> [Note]
    func save(_ note: Note) async throws
}

// A small JSON file is sufficient for this example's single collection.
actor JSONNotesRepository: NotesRepository {
    private let file: URL
    init(file: URL) { self.file = file }

    func load() throws -> [Note] {
        do {
            return try JSONDecoder().decode([Note].self, from: Data(contentsOf: file))
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            return []
        }
    }

    // Keep the read and replacement in one actor turn.
    func save(_ note: Note) throws {
        let notes = try load()
        let data = try JSONEncoder().encode(notes + [note])
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: file, options: .atomic)
    }
}

enum NoteError: Error { case emptyText }

@MainActor @Observable
final class NotesFeature {
    private let repository: any NotesRepository
    @ObservationIgnored private var lastSave: (id: UUID, task: Task<Void, Error>)?
    @ObservationIgnored private var loading: (id: UUID, task: Task<[Note], Error>)?
    private var didLoad = false
    private(set) var notes: [Note] = []

    init(repository: any NotesRepository) { self.repository = repository }

    func loadIfNeeded() async throws {
        guard !didLoad else { return }
        let task: Task<[Note], Error>
        let id: UUID
        if let loading {
            task = loading.task
            id = loading.id
        } else {
            task = Task { try await repository.load() }
            id = UUID()
            loading = (id, task)
        }
        do {
            let loaded = try await task.value
            if !didLoad { notes = loaded; didLoad = true }
            if loading?.id == id { loading = nil }
        } catch {
            if loading?.id == id { loading = nil }
            throw error
        }
    }

    // Every admitted save runs after the preceding save, even after a failure.
    // The Feature owns the work so a disappearing editor does not cancel it.
    func save(_ text: String) async throws {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw NoteError.emptyText }
        let note = Note(id: UUID(), text: trimmed)
        let previous = lastSave?.task
        let id = UUID()
        let operation = Task { @MainActor in
            // A failed earlier save is reported to its caller, but does not block this save.
            _ = await previous?.result
            try await loadIfNeeded()
            try await repository.save(note)
            notes.append(note)
        }
        lastSave = (id, operation)
        defer {
            if lastSave?.id == id { lastSave = nil }
        }
        try await operation.value
    }
}

@MainActor
final class AppModel {
    static let shared = AppModel.live()
    let notesFeature: NotesFeature
    private var hasLaunched: Bool

    init(notesFeature: NotesFeature) {
        self.notesFeature = notesFeature
        hasLaunched = false
    }
    static func live() -> AppModel {
        let directory = URL.applicationSupportDirectory
        return AppModel(notesFeature: NotesFeature(repository: JSONNotesRepository(file: directory.appendingPathComponent("notes.json"))))
    }
    func applicationDidFinishLaunching() {
        guard !hasLaunched else { return }
        hasLaunched = true
    }
}

@MainActor @Observable
final class NotesEditorViewModel {
    private let notesFeature: NotesFeature
    @ObservationIgnored private var saveTask: Task<Bool, Never>?
    @ObservationIgnored private var loadTask: Task<Void, Never>?
    var text = ""
    private(set) var isSaving = false
    private(set) var saveError: String?
    private(set) var loadError: String?

    init(notesFeature: NotesFeature = AppModel.shared.notesFeature) {
        self.notesFeature = notesFeature
    }

    func load() async {
        do {
            try await notesFeature.loadIfNeeded()
            if !Task.isCancelled { loadError = nil }
        } catch {
            if !Task.isCancelled { loadError = "Notes could not be loaded. Please try again." }
        }
    }

    @discardableResult
    func retryLoad() -> Task<Void, Never> {
        if let loadTask { return loadTask }
        let task = Task {
            defer { loadTask = nil }
            await load()
        }
        loadTask = task
        return task
    }

    @discardableResult
    func save(onSuccess: @escaping @MainActor () -> Void = {}) -> Task<Bool, Never> {
        if let saveTask { return saveTask }
        let submittedText = text
        isSaving = true
        saveError = nil
        let task = Task { [weak self, notesFeature] in
            defer { self?.isSaving = false; self?.saveTask = nil }
            do {
                try await notesFeature.save(submittedText)
                // Saving also confirms that initial restoration succeeded.
                self?.loadError = nil
                if let self, text == submittedText {
                    text = ""
                }
                onSuccess()
                return true
            } catch NoteError.emptyText {
                self?.saveError = "Enter a note before saving."
                return false
            } catch {
                self?.saveError = "The note could not be saved. Please try again."
                return false
            }
        }
        saveTask = task
        return task
    }
}

struct NotesEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = NotesEditorViewModel()

    var body: some View {
        @Bindable var viewModel = viewModel
        Form {
            TextField("Note", text: $viewModel.text).disabled(viewModel.isSaving)
            if let error = viewModel.saveError { Text(error) }
            if let error = viewModel.loadError {
                Text(error)
                Button("Try again") { viewModel.retryLoad() }
            }
            Button("Save") { viewModel.save { dismiss() } }
                .disabled(viewModel.isSaving)
            Button("Cancel", role: .cancel) { dismiss() }
                .disabled(viewModel.isSaving)
        }
        .interactiveDismissDisabled(viewModel.isSaving)
        .task { await viewModel.load() }
    }
}
```

The editor’s lifecycle task awaits the ViewModel’s async load directly. The
Feature owns the shared load and can retain its result after the editor closes.
The screen caller awaits the shared result even if SwiftUI cancels its task.
On return, the ViewModel checks cancellation before updating the editor’s
error state. The ViewModel retains a separate task for retries started by the
button.
