# Runnable CFA examples

## Notes reference feature

[NotesReference.swift](NotesReference.swift) demonstrates a screen View, its ViewModel, a Feature, JSON persistence and AppModel composition. [NotesReferenceTests.swift](NotesReferenceTests.swift) exercises load and save failure recovery, ordered overlapping saves, JSON persistence and a fresh editor. From this directory on macOS with Xcode and Swift 6, run:

`xcrun swiftc -swift-version 6 -parse-as-library NotesReference.swift NotesReferenceTests.swift -o /tmp/cfa-notes-tests && /tmp/cfa-notes-tests`

This is a composable feature slice, not a complete app or a SwiftUI navigation test. See [starter apps and open-source projects](open-source-apps.md) for complete projects.

## Deep-linking example

Run on macOS 14 or later with Swift 6 language mode:

`swiftc -swift-version 6 -parse-as-library DeepLinkingExample.swift -o /tmp/cfa-deep-link-example && /tmp/cfa-deep-link-example`

The example saves a safe destination, simulates a scene declining navigation, restores the request in a new Feature instance, and removes it after simulated navigation. It checks repeated delivery, competing scene attempts, a cancelled navigation attempt, explicit dismissal across a restart and a failed write. Expected output begins with “Passed”. The file store and handler are deliberately small teaching implementations: this is not a notification delegate, URL parser, multi-process store, or a real SwiftUI navigation flow. If navigation succeeds but removing the persisted request fails, the call throws and the request remains stored; a real app must handle that outcome rather than automatically reopening it. Real applications must handle expiration, duplicate deliveries across restarts and scene lifetimes according to the specification.
