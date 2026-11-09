# Reference feature: recording a note

This complete feature slice follows the path from a screen through its dedicated
ViewModel, Feature and JSON persistence service. The screen ViewModel owns the
unsaved text. The Feature queues admitted saves in order, persists each note
before publication, and continues owned work if the awaiting caller is cancelled.
A caller already cancelled at entry does not submit a save. The editor retains
its draft without displaying a storage error for cancellation.
The caller still awaits the admitted save’s outcome. A failed save leaves the
editor open with its text available for retry. Cancel clears the draft and
closes the editor without saving. During a save, the editor disables text
entry, Save, Cancel and interactive sheet dismissal.

The code below is also available as [NotesReference.swift](spec/examples/NotesReference.swift).
The accompanying [executable checks](spec/examples/NotesReferenceTests.swift)
verify failure recovery, discard without a write, publication after persistence,
ordered independent saves, JSON storage and fresh editor state. Repeated Save
taps share one result and invoke the dismissal callback once. A failed save
leaves the draft intact without invoking the callback. A successful save
publishes the note and clears the submitted draft before invoking it. If the
draft changed programmatically during the save, it stays in the editor. A queued
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
and draft. After a valid file is restored, retrying the load through the same
ViewModel and Feature reloads the saved notes without submitting the draft.
Both editors stop showing the load error once their shared Feature recovers.
The second editor can then save its retained draft. A fixed
synthetic JSON fixture
also verifies that an existing note survives opening, appending a note, and
reopening the store. The checks also hold an earlier published collection and
verify that it stays unchanged when the Feature publishes the updated notes.
For a shipped app, use a disposable store written by the
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
    private var loading: Task<Void, Error>?
    var isLoading: Bool { loading != nil }
    private(set) var didLoad = false
    private(set) var notes: [Note] = []

    init(repository: any NotesRepository) { self.repository = repository }

    func loadIfNeeded() async throws {
        guard !didLoad else { return }
        if let loading {
            try await loading.value
            return
        }

        // The Feature publishes the result even if every caller leaves.
        let task = Task {
            defer { loading = nil }
            notes = try await repository.load()
            didLoad = true
        }
        loading = task
        try await task.value
    }

    // Every admitted save runs after the preceding save, even after a failure.
    // The Feature owns the work so a disappearing editor does not cancel it.
    func save(_ text: String) async throws {
        try Task.checkCancellation()
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
    private var loadTask: Task<Void, Never>?
    var text = ""
    private(set) var isSaving = false
    private(set) var saveError: String?
    private var loadFailed = false

    var isRetryingLoad: Bool { loadTask != nil }
    var isLoading: Bool { notesFeature.isLoading || isRetryingLoad }

    var loadError: String? {
        guard loadFailed, !notesFeature.didLoad else { return nil }
        return "Notes could not be loaded. Please try again."
    }

    init(notesFeature: NotesFeature = AppModel.shared.notesFeature) {
        self.notesFeature = notesFeature
    }

    func load() async {
        do {
            try await notesFeature.loadIfNeeded()
        } catch {
            if !Task.isCancelled { loadFailed = true }
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

    func discardDraft() {
        text = ""
        saveError = nil
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
                if let self, text == submittedText {
                    text = ""
                    onSuccess()
                }
                return true
            } catch is CancellationError {
                return false
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
                    .disabled(viewModel.isLoading)
            }
            if viewModel.isLoading {
                ProgressView("Loading notes")
            }
            Button("Save") { viewModel.save { dismiss() } }
                .disabled(viewModel.isSaving)
            Button("Cancel", role: .cancel) {
                viewModel.discardDraft()
                dismiss()
            }
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
button. The editor shows progress during the shared load, including retries,
and disables the retry button while loading.
