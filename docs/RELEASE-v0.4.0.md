# CFA AI Toolkit for iOS — v0.4.0

The Swift Concurrency Health Check helps developers understand how an iOS app coordinates work, owns state and handles cancellation.

## Health Check

The toolkit inventories Swift source and uses SwiftSyntax to identify task and entry-point candidates. The architecture review skill traces app operations, considers repeated actions, cancellation, late results and failures, and produces an app-specific HTML report with grouped actions and source evidence.

The scanner supplies evidence for a review; it does not automatically prove concurrency correctness or reconstruct every runtime path. The report reflects the source and evidence reviewed.

## CFA guidance

The toolkit clarifies synchronous launch signals, immutable snapshots, detail navigation and the distinction between authoritative persistence and optional caches.

## Download and install

Extract **ios-app-development-cfa-0.4.0-plugin.zip** and run `Install.command`, or use `node scripts/install.mjs`. Existing managed installations can use `node scripts/install.mjs --replace`. Node.js 20+ is required.

The source ZIP is for contributors; `SHA256SUMS` covers both archives. Xcode templates remain separately installable using `Install Xcode Template.command`.
