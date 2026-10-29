# Reference feature: recording a note

`NotesView` owns `@State private var viewModel = NotesViewModel()`.
Callers use `NotesView()` with zero inputs. No custom initializer accepts or
constructs its ViewModel, even through a default parameter. Unit tests construct
NotesViewModel directly with an isolated NotesFeature; display-only components
can still receive plain snapshots.
`NotesViewModel` retains `NotesFeature`, defaulting to `AppModel.shared.notesFeature`.
It owns the editable draft and display error. `NotesFeature` validates the text,
uses an injected repository to save it, and publishes the committed note. A failed
save retains the draft and leaves the feature’s collection unchanged.

`AppModel.live()` constructs the repository and feature. The AppModel initializer
requires those dependencies explicitly. Tests assemble a separate graph and never
mutate the production singleton. `Note` is a feature-owned immutable domain value;
SwiftData representations live inside the repository implementation.

The concrete feature offers domain commands, not mutable storage objects. Tests
construct it with a fake `NotesRepository`; no matching feature protocol is
needed. An actor
can isolate the repository or a substantial worker. Use MainActor for observable
publication; do not move expensive file/CPU work onto it merely for convenience.

Folder map:

```text
1 - View/Views/Notes/NotesView.swift
1 - View/Views/Notes/NotesViewModel.swift
2 - AppModel/AppModel.swift
2 - AppModel/Features/Notes/NotesFeature.swift
2 - AppModel/Features/Notes/Note.swift
2 - AppModel/User Data Storage/Protocols/NotesRepository.swift
2 - AppModel/User Data Storage/Local/LocalNotesRepository.swift
```

The minimal example in the toolkit demonstrates these boundaries. It is a small
teaching fixture, not a production app template or an implementation of every CFA rule.
