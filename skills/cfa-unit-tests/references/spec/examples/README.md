# Runnable CFA examples

## Notes reference feature

[NotesReference.swift](NotesReference.swift) demonstrates a screen View, its ViewModel, a Feature, JSON persistence and AppModel composition. [NotesReferenceTests.swift](NotesReferenceTests.swift) exercises load and save failure recovery, publication after persistence, repeated Save taps, ordered independent saves, JSON persistence, preservation of unreadable storage and fresh editor state. From this directory on macOS with Xcode and Swift 6, run:

`xcrun swiftc -swift-version 6 -parse-as-library NotesReference.swift NotesReferenceTests.swift -o /tmp/cfa-notes-tests && /tmp/cfa-notes-tests`

This is a composable feature slice, not a complete app or a SwiftUI navigation test. See [starter apps and open-source projects](open-source-apps.md) for complete projects.

## Deep-linking example

Run on macOS 14 or later with Swift 6 language mode:

`swiftc -swift-version 6 -parse-as-library DeepLinkingExample.swift -o /tmp/cfa-deep-link-example && /tmp/cfa-deep-link-example`

The example saves a safe destination, simulates a scene declining navigation, restores the request in a new Feature instance, and removes it after simulated navigation. It checks repeated delivery, competing scene attempts, independent scene destinations, cancellation before and after navigation, and a failed write. It also verifies that receiving a request before restoration or dismissing one request preserves unrelated pending items across restart. Expected output begins with “Passed”. The Feature accesses persistence through PendingRequestRepository. The file store and handler are deliberately small teaching implementations: this is not a notification delegate, URL parser, multi-process store, or a real SwiftUI navigation flow. Opening and dismissing the same request cannot run concurrently. If navigation succeeds and durable removal fails, the example reports the failure and retries removal without navigating again in the current process. If the process exits before removal succeeds, the stored request can reappear on restart. The request ID identifies one opening event. Repeated callbacks for that event reuse its ID. A new opening request gets a new ID even if it points to the same destination. The example keeps resolved IDs in memory for the store’s lifetime. Real applications must handle expiration, duplicate deliveries across restarts and scene lifetimes according to the specification.
