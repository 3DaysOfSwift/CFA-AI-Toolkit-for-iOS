import Foundation

actor ControlledNotes: NotesRepository {
    private(set) var saved: [String] = []
    private var firstStarted: CheckedContinuation<Void, Never>?
    private var releaseFirst: CheckedContinuation<Void, Never>?
    private var started = false
    func waitForFirst() async {
        if started { return }
        await withCheckedContinuation { firstStarted = $0 }
    }
    func release() { releaseFirst?.resume(); releaseFirst = nil }
    func load() async throws -> [Note] { [] }
    func save(_ note: Note) async throws {
        if note.text == "fail" { throw CocoaError(.fileWriteNoPermission) }
        if note.text == "first" || note.text == "fail after wait" {
            started = true
            firstStarted?.resume(); firstStarted = nil
            await withCheckedContinuation { releaseFirst = $0 }
            if note.text == "fail after wait" { throw CocoaError(.fileWriteNoPermission) }
        }
        saved.append(note.text)
    }
}

actor RetryableNotes: NotesRepository {
    private var attempts = 0
    let note = Note(id: UUID(), text: "Previously saved")
    func load() async throws -> [Note] {
        attempts += 1
        if attempts == 1 { throw CocoaError(.fileReadNoPermission) }
        return [note]
    }
    func save(_ note: Note) async throws {}
}

@main struct NotesReferenceTests {
    @MainActor static func main() async throws {
        let retryRepository = RetryableNotes()
        let retryFeature = NotesFeature(repository: retryRepository)
        let retryModel = NotesEditorViewModel(notesFeature: retryFeature)
        await retryModel.load().value
        precondition(retryModel.loadError != nil && retryFeature.notes.isEmpty)
        await retryModel.load().value
        precondition(retryModel.loadError == nil && retryFeature.notes.map(\.text) == ["Previously saved"])

        let repository = ControlledNotes()
        let feature = NotesFeature(repository: repository)
        let model = NotesEditorViewModel(notesFeature: feature)
        model.text = "  "
        let empty = await model.save().value
        precondition(!empty && model.text == "  " && model.saveError == "Enter a note before saving.")
        precondition(feature.notes.isEmpty)
        model.text = "fail"
        let failure = await model.save().value
        precondition(!failure && model.text == "fail" && model.saveError != nil && feature.notes.isEmpty)
        let cancelledEditor = NotesEditorViewModel(notesFeature: feature)
        cancelledEditor.text = "discarded"
        let replacementEditor = NotesEditorViewModel(notesFeature: feature)
        precondition(replacementEditor.text.isEmpty && feature.notes.isEmpty)
        model.text = "retry"
        let success = await model.save().value
        precondition(success && feature.notes.map(\.text) == ["retry"])
        let first = Task { try await feature.save("first") }
        await repository.waitForFirst()
        first.cancel() // A departing caller does not cancel the Feature-owned save.
        // Each MainActor task signals immediately before entering save. The
        // waiting test can resume on MainActor only once save has suspended.
        let secondStarted = AsyncStream<Void>.makeStream()
        let second = Task { @MainActor in
            secondStarted.continuation.yield(())
            try await feature.save("second")
        }
        var secondSignal = secondStarted.stream.makeAsyncIterator()
        await secondSignal.next()
        secondStarted.continuation.finish()
        let thirdStarted = AsyncStream<Void>.makeStream()
        let third = Task { @MainActor in
            thirdStarted.continuation.yield(())
            try await feature.save("second")
        }
        var thirdSignal = thirdStarted.stream.makeAsyncIterator()
        await thirdSignal.next()
        thirdStarted.continuation.finish()
        let before = await repository.saved
        precondition(before == ["retry"])
        await repository.release()
        try await first.value
        try await second.value
        try await third.value
        let saved = await repository.saved
        precondition(saved == ["retry", "first", "second", "second"])
        precondition(feature.notes.map(\.text) == saved)

        let failingRepository = ControlledNotes()
        let failingFeature = NotesFeature(repository: failingRepository)
        let delayedFailure = Task { try await failingFeature.save("fail after wait") }
        await failingRepository.waitForFirst()
        let laterSave = Task { try await failingFeature.save("after failure") }
        await failingRepository.release()
        do {
            try await delayedFailure.value
            preconditionFailure("The failed save must report its error")
        } catch is CocoaError {}
        try await laterSave.value
        let savedAfterFailure = await failingRepository.saved
        precondition(savedAfterFailure == ["after failure"])
        precondition(failingFeature.notes.map(\.text) == savedAfterFailure)
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("notes.json")
        let disk = JSONNotesRepository(file: url)
        let item = Note(id: UUID(), text: "Stored")
        try await disk.save(item)
        let restored = try JSONDecoder().decode([Note].self, from: Data(contentsOf: url))
        precondition(restored == [item])
        print("Notes reference: failed save, retry, ordered overlap and JSON storage passed")
    }
}
