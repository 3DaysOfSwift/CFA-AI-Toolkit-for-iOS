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
        if !started && (note.text == "first" || note.text == "fail after wait") {
            started = true
            firstStarted?.resume(); firstStarted = nil
            await withCheckedContinuation { releaseFirst = $0 }
            // A cancelled save task would stop a cooperative repository here.
            try Task.checkCancellation()
            if note.text == "fail after wait" { throw CocoaError(.fileWriteNoPermission) }
        }
        saved.append(note.text)
    }
}

actor RetryableNotes: NotesRepository {
    private(set) var attempts = 0
    let note = Note(id: UUID(), text: "Previously saved")
    func load() async throws -> [Note] {
        attempts += 1
        if attempts == 1 { throw CocoaError(.fileReadNoPermission) }
        return [note]
    }
    func save(_ note: Note) async throws {}
}

actor HeldNotesLoad: NotesRepository {
    private(set) var attempts = 0
    private var started: CheckedContinuation<Void, Never>?
    private var response: CheckedContinuation<[Note], Never>?
    private(set) var saved: [Note] = []

    func load() async throws -> [Note] {
        attempts += 1
        precondition(attempts == 1, "Both callers should share one repository load")
        let notes = await withCheckedContinuation { continuation in
            response = continuation
            started?.resume()
            started = nil
        }
        try Task.checkCancellation()
        return notes
    }

    func waitForLoad() async {
        if response != nil { return }
        await withCheckedContinuation { started = $0 }
    }

    func finish(with note: Note) {
        response?.resume(returning: [note])
        response = nil
    }

    func save(_ note: Note) async throws {
        precondition(response == nil, "Restore existing notes before saving")
        saved.append(note)
    }
}

@main struct NotesReferenceTests {
    @MainActor static func main() async throws {
        let heldLoad = HeldNotesLoad()
        let sharedFeature = NotesFeature(repository: heldLoad)
        let departingModel = NotesEditorViewModel(notesFeature: sharedFeature)
        let stayingModel = NotesEditorViewModel(notesFeature: sharedFeature)
        let departing = Task { await departingModel.load() }
        await heldLoad.waitForLoad()
        precondition(departingModel.isLoading && stayingModel.isLoading)
        let stayingStarted = AsyncStream<Void>.makeStream()
        let staying = Task { @MainActor in
            stayingStarted.continuation.yield(())
            await stayingModel.load()
        }
        // This test resumes on MainActor after the staying caller suspends in load.
        var stayingSignal = stayingStarted.stream.makeAsyncIterator()
        await stayingSignal.next()
        stayingStarted.continuation.finish()
        departing.cancel()
        let loadedNote = Note(id: UUID(), text: "Shared load")
        await heldLoad.finish(with: loadedNote)
        await departing.value
        await staying.value
        precondition(!departingModel.isLoading && !stayingModel.isLoading)
        precondition(sharedFeature.notes == [loadedNote] && stayingModel.loadError == nil)

        let unattendedLoad = HeldNotesLoad()
        let unattendedFeature = NotesFeature(repository: unattendedLoad)
        let onlyModel = NotesEditorViewModel(notesFeature: unattendedFeature)
        let onlyWaiter = Task { await onlyModel.load() }
        await unattendedLoad.waitForLoad()
        onlyWaiter.cancel()
        let unattendedNote = Note(id: UUID(), text: "Loaded after cancellation")
        await unattendedLoad.finish(with: unattendedNote)
        await onlyWaiter.value
        precondition(unattendedFeature.notes == [unattendedNote])

        let restoringRepository = HeldNotesLoad()
        let restoringFeature = NotesFeature(repository: restoringRepository)
        let restore = Task { try await restoringFeature.loadIfNeeded() }
        await restoringRepository.waitForLoad()
        let editor = NotesEditorViewModel(notesFeature: restoringFeature)
        editor.text = "New note"
        let saveWhileRestoring = editor.save()
        let existingNote = Note(id: UUID(), text: "Existing note")
        await restoringRepository.finish(with: existingNote)
        try await restore.value
        let savedDuringRestore = await saveWhileRestoring.value
        let writes = await restoringRepository.saved
        precondition(savedDuringRestore && writes.map(\.text) == ["New note"])
        precondition(restoringFeature.notes == [existingNote] + writes)

        let retryRepository = RetryableNotes()
        let retryFeature = NotesFeature(repository: retryRepository)
        let retryModel = NotesEditorViewModel(notesFeature: retryFeature)
        let cancelledLoad = Task { @MainActor in await retryModel.load() }
        cancelledLoad.cancel()
        await cancelledLoad.value
        let cancelledFeatureLoad = Task { @MainActor in
            try await retryFeature.loadIfNeeded()
        }
        cancelledFeatureLoad.cancel()
        do {
            try await cancelledFeatureLoad.value
            preconditionFailure("A cancelled caller must not start a new load.")
        } catch is CancellationError {
            // The Feature rejects this caller before admitting any work.
        }
        let attemptsAfterCancellation = await retryRepository.attempts
        precondition(attemptsAfterCancellation == 0 && retryModel.loadError == nil)
        await retryModel.load()
        precondition(retryModel.loadError != nil && retryFeature.notes.isEmpty)
        let firstRetry = retryModel.retryLoad()
        precondition(retryModel.isRetryingLoad)
        let repeatedRetry = retryModel.retryLoad()
        await firstRetry.value
        await repeatedRetry.value
        precondition(!retryModel.isRetryingLoad)
        let attempts = await retryRepository.attempts
        precondition(attempts == 2)
        precondition(retryModel.loadError == nil && retryFeature.notes.map(\.text) == ["Previously saved"])

        let repository = ControlledNotes()
        let isolatedAppModel = AppModel(notesFeature: NotesFeature(repository: repository))
        let secondAppModel = AppModel(notesFeature: NotesFeature(repository: ControlledNotes()))
        let notesFeature = isolatedAppModel.notesFeature
        let viewModel = NotesEditorViewModel(notesFeature: notesFeature)
        viewModel.text = "  "
        let empty = await viewModel.save().value
        precondition(!empty && viewModel.text == "  " && viewModel.saveError == "Enter a note before saving.")
        precondition(notesFeature.notes.isEmpty)
        viewModel.text = "fail"
        let failure = await viewModel.save {
            preconditionFailure("A failed save must leave the editor open")
        }.value
        precondition(!failure && viewModel.text == "fail" && viewModel.saveError != nil && notesFeature.notes.isEmpty)
        let cancelledSave = viewModel.save {
            preconditionFailure("A cancelled save must leave the editor open")
        }
        cancelledSave.cancel()
        let savedAfterCancellation = await cancelledSave.value
        precondition(!savedAfterCancellation && viewModel.text == "fail")
        precondition(viewModel.saveError == nil && !viewModel.isSaving && notesFeature.notes.isEmpty)

        viewModel.text = "retry"
        let success = await viewModel.save().value
        precondition(success && viewModel.text.isEmpty && notesFeature.notes.map(\.text) == ["retry"])
        precondition(secondAppModel.notesFeature.notes.isEmpty, "An isolated AppModel owns a separate Feature graph")
        let confirmedBeforeFailure = notesFeature.notes
        viewModel.text = "fail"
        let failedBeforeDiscard = await viewModel.save().value
        precondition(!failedBeforeDiscard && viewModel.saveError != nil)
        precondition(viewModel.text == "fail", "The failed save keeps the draft available for retry")
        precondition(notesFeature.notes == confirmedBeforeFailure, "A failed save preserves confirmed notes")
        viewModel.discardDraft()
        let savedAfterDiscard = await repository.saved
        precondition(viewModel.text.isEmpty && viewModel.saveError == nil)
        precondition(savedAfterDiscard == ["retry"] && notesFeature.notes.map(\.text) == savedAfterDiscard)

        // The task cannot enter save until this MainActor test suspends.
        let cancelledBeforeAdmission = Task { @MainActor in
            try await notesFeature.save("cancelled before admission")
        }
        cancelledBeforeAdmission.cancel()
        do {
            try await cancelledBeforeAdmission.value
            preconditionFailure("A cancelled caller must not submit a new save")
        } catch is CancellationError {
            precondition(notesFeature.notes == confirmedBeforeFailure)
        }

        let first = Task { try await notesFeature.save("first") }
        await repository.waitForFirst()
        first.cancel() // A departing caller does not cancel the Feature-owned save.
        // Each MainActor task signals immediately before entering save. The
        // waiting test can resume on MainActor only once save has suspended.
        let secondStarted = AsyncStream<Void>.makeStream()
        let second = Task { @MainActor in
            secondStarted.continuation.yield(())
            try await notesFeature.save("second")
        }
        var secondSignal = secondStarted.stream.makeAsyncIterator()
        await secondSignal.next()
        secondStarted.continuation.finish()
        let thirdStarted = AsyncStream<Void>.makeStream()
        let third = Task { @MainActor in
            thirdStarted.continuation.yield(())
            try await notesFeature.save("second")
        }
        var thirdSignal = thirdStarted.stream.makeAsyncIterator()
        await thirdSignal.next()
        thirdStarted.continuation.finish()
        let before = await repository.saved
        precondition(before == ["retry"])
        precondition(notesFeature.notes.map(\.text) == before, "Publish only after the pending write succeeds")
        let earlierSnapshot = notesFeature.notes
        await repository.release()
        try await first.value
        try await second.value
        try await third.value
        let saved = await repository.saved
        precondition(saved == ["retry", "first", "second", "second"])
        precondition(notesFeature.notes.map(\.text) == saved)
        precondition(earlierSnapshot == confirmedBeforeFailure, "A reader keeps its earlier snapshot after new saves")

        let repeatedTapRepository = ControlledNotes()
        let repeatedTapFeature = NotesFeature(repository: repeatedTapRepository)
        let repeatedTapEditor = NotesEditorViewModel(notesFeature: repeatedTapFeature)
        repeatedTapEditor.text = "first"
        var dismissals = 0
        let firstTap = repeatedTapEditor.save {
            precondition(repeatedTapFeature.notes.map(\.text) == ["first"])
            precondition(repeatedTapEditor.text.isEmpty)
            dismissals += 1
        }
        await repeatedTapRepository.waitForFirst()
        let secondTap = repeatedTapEditor.save { dismissals += 1 }
        precondition(repeatedTapEditor.isSaving && repeatedTapFeature.notes.isEmpty)
        precondition(dismissals == 0 && repeatedTapEditor.text == "first")
        await repeatedTapRepository.release()
        let firstTapSucceeded = await firstTap.value
        let secondTapSucceeded = await secondTap.value
        let savedFromTaps = await repeatedTapRepository.saved
        precondition(firstTapSucceeded && secondTapSucceeded)
        precondition(savedFromTaps == ["first"] && dismissals == 1)
        precondition(!repeatedTapEditor.isSaving)

        let changedDraftRepository = ControlledNotes()
        let changedDraftFeature = NotesFeature(repository: changedDraftRepository)
        let changedDraftEditor = NotesEditorViewModel(notesFeature: changedDraftFeature)
        changedDraftEditor.text = "first"
        let submittedDraft = changedDraftEditor.save {
            preconditionFailure("A newer draft must keep the editor open")
        }
        await changedDraftRepository.waitForFirst()
        changedDraftEditor.text = "Newer draft"
        await changedDraftRepository.release()
        let submittedDraftSaved = await submittedDraft.value
        precondition(submittedDraftSaved && changedDraftFeature.notes.map(\.text) == ["first"])
        precondition(changedDraftEditor.text == "Newer draft" && !changedDraftEditor.isSaving)

        let failingRepository = ControlledNotes()
        let failingFeature = NotesFeature(repository: failingRepository)
        let delayedFailure = Task { try await failingFeature.save("fail after wait") }
        await failingRepository.waitForFirst()
        let laterStarted = AsyncStream<Void>.makeStream()
        let laterSave = Task { @MainActor in
            laterStarted.continuation.yield(())
            try await failingFeature.save("after failure")
        }
        var laterSignal = laterStarted.stream.makeAsyncIterator()
        await laterSignal.next()
        laterStarted.continuation.finish()
        let savedBeforeFailure = await failingRepository.saved
        precondition(savedBeforeFailure.isEmpty)
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
        let notesFileURL = folder.appendingPathComponent("notes.json")
        let diskRepository = JSONNotesRepository(file: notesFileURL)
        let storedNote = Note(id: UUID(), text: "Stored")
        try await diskRepository.save(storedNote)
        let restored = try JSONDecoder().decode([Note].self, from: Data(contentsOf: notesFileURL))
        precondition(restored == [storedNote])

        let editingFeature = NotesFeature(repository: diskRepository)
        do {
            // Model the sheet's Cancel path by ending the editor's lifetime.
            let editor = NotesEditorViewModel(notesFeature: editingFeature)
            await editor.load()
            editor.text = "Discard this unsaved note"
        }
        let replacementEditor = NotesEditorViewModel(notesFeature: editingFeature)
        precondition(replacementEditor.text.isEmpty)
        precondition(editingFeature.notes == [storedNote])
        let storedAfterDiscard = try await diskRepository.load()
        precondition(storedAfterDiscard == [storedNote])

        let firstNote = Note(id: UUID(), text: "First concurrent save")
        let secondNote = Note(id: UUID(), text: "Second concurrent save")
        async let saveFirst: Void = diskRepository.save(firstNote)
        async let saveSecond: Void = diskRepository.save(secondNote)
        _ = try await (saveFirst, saveSecond)
        let afterOverlap = try await JSONNotesRepository(file: notesFileURL).load()
        precondition(afterOverlap.first == storedNote)
        precondition(Set(afterOverlap.dropFirst().map(\.id)) == Set([firstNote.id, secondNote.id]))
        precondition(afterOverlap.count == 3)
        let corruptBytes = Data("Invalid JSON".utf8)
        try corruptBytes.write(to: notesFileURL, options: .atomic)
        let corruptFeature = NotesFeature(repository: diskRepository)
        let corruptEditor = NotesEditorViewModel(notesFeature: corruptFeature)
        corruptEditor.text = "Keep this draft"
        let corruptSave = await corruptEditor.save().value
        let remainingBytes = try Data(contentsOf: notesFileURL)
        precondition(!corruptSave && corruptEditor.saveError != nil)
        precondition(corruptEditor.text == "Keep this draft" && corruptFeature.notes.isEmpty)
        precondition(remainingBytes == corruptBytes, "A failed read must not overwrite saved bytes")
        await corruptEditor.load()
        precondition(corruptEditor.loadError != nil && corruptFeature.notes.isEmpty)

        let savingEditor = NotesEditorViewModel(notesFeature: corruptFeature)
        await savingEditor.load()
        precondition(savingEditor.loadError != nil)
        savingEditor.text = "Save after restoration"
        let originalLoadError = savingEditor.loadError
        let saveWhileLoadIsFailed = await savingEditor.save().value
        precondition(!saveWhileLoadIsFailed && savingEditor.saveError != nil)
        precondition(savingEditor.loadError == originalLoadError)
        precondition(savingEditor.text == "Save after restoration" && corruptFeature.notes.isEmpty)

        // Restore the known good file, then retry through the same screen and Feature.
        try JSONEncoder().encode(afterOverlap).write(to: notesFileURL, options: .atomic)
        await corruptEditor.retryLoad().value
        precondition(corruptEditor.loadError == nil && corruptFeature.notes == afterOverlap)
        precondition(corruptEditor.text == "Keep this draft")
        precondition(savingEditor.loadError == nil, "Shared recovery clears the other editor’s load error")
        precondition(savingEditor.text == "Save after restoration")
        let snapshotBeforeSave = corruptFeature.notes
        let recoveredSave = await savingEditor.save().value
        precondition(recoveredSave && savingEditor.loadError == nil && savingEditor.saveError == nil)
        precondition(snapshotBeforeSave == afterOverlap, "An earlier reader keeps its confirmed snapshot")
        precondition(corruptFeature.notes.map(\.text) == afterOverlap.map(\.text) + ["Save after restoration"])
        // Fixed JSON represents an existing store independently of today's encoder.
        let existingStore = folder.appendingPathComponent("existing-notes.json")
        let existingJSON = #"[{"id":"00000000-0000-0000-0000-000000000001","text":"Existing note"}]"#
        try Data(existingJSON.utf8).write(to: existingStore, options: .atomic)
        let existingFeature = NotesFeature(repository: JSONNotesRepository(file: existingStore))
        try await existingFeature.loadIfNeeded()
        let existingNotes = existingFeature.notes
        precondition(existingNotes.map(\.text) == ["Existing note"])
        try await existingFeature.save("Added note")
        precondition(existingNotes.map(\.text) == ["Existing note"])
        precondition(existingFeature.notes.map(\.text) == ["Existing note", "Added note"])
        let reopenedNotes = try await JSONNotesRepository(file: existingStore).load()
        precondition(reopenedNotes.first == existingNotes.first)
        precondition(reopenedNotes.map(\.text) == ["Existing note", "Added note"])

        // A file at the parent path prevents the configured store from opening.
        let blockedParent = folder.appendingPathComponent("blocked-parent")
        let blocker = Data("Preserve this file".utf8)
        try blocker.write(to: blockedParent)
        let blockedStore = blockedParent.appendingPathComponent("notes.json")
        let blockedFeature = NotesFeature(repository: JSONNotesRepository(file: blockedStore))
        let blockedEditor = NotesEditorViewModel(notesFeature: blockedFeature)
        blockedEditor.text = "Retry after fixing the store path"
        let blockedSave = await blockedEditor.save().value
        precondition(!blockedSave && blockedEditor.saveError != nil && blockedFeature.notes.isEmpty)
        precondition(blockedEditor.text == "Retry after fixing the store path")
        let preservedBlocker = try Data(contentsOf: blockedParent)
        precondition(preservedBlocker == blocker)
        try FileManager.default.removeItem(at: blockedParent)
        let unblockedSave = await blockedEditor.save().value
        let unblockedNotes = try await JSONNotesRepository(file: blockedStore).load()
        precondition(unblockedSave && unblockedNotes == blockedFeature.notes && unblockedNotes.count == 1)

        print("Notes reference: failed save, retry, ordered overlap and JSON storage passed")
    }
}
