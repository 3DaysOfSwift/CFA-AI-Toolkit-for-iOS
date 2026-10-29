# CFA AI Toolkit for iOS — v0.3.3

The eight AI skills can now offer a relevant free explanation when a developer
asks why CFA works a particular way. All 17 catalogue entries point to reviewed,
publicly accessible articles. The skills still answer directly, work offline and
make further reading optional.

## Published explanations

Fourteen tutorials lead with real code from Trend, Cuentiva and Next Rocket Launch,
then explain the approach, problem, reasoning and advantages. The three original
concurrency explanations retain their teaching sequence. All seventeen share the
approved layout and illustrated training-program footer.

Each catalogue entry records its URL, verification date, relevant topic review and
content hash. The public pages were checked without login at desktop and mobile
widths. Existing singular `/cfa/explanation/{slug}` routes are preserved.
The lookup helper now recognises those routes while continuing to reject unsafe
URLs and links without publication evidence.

Start with [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition)
or [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

## Clearer isolation boundary

All CFA Features own authoritative application state on MainActor, including
capabilities that do not yet have a screen. Networking, persistence and expensive
processing belong behind appropriately isolated services. A networking service
may be an actor when it protects shared internal machinery; ordinary helpers do
not each need their own actor. A separate type or an async method does not, by
itself, move synchronous work off the main actor.

These are CFA design conventions alongside Swift's actual isolation rules.
This release does not automatically refactor an existing application.

## Download and install

Extract **ios-app-development-cfa-0.3.3-plugin.zip** and run `Install.command`, or
use `node scripts/install.mjs`. For an existing managed installation, use
`node scripts/install.mjs --replace`; edited or unrelated files are protected.
Node.js 20+ is required. No npm dependencies or PyYAML are required.

The source ZIP is for contributors. `SHA256SUMS` covers both archives.
Native Xcode templates remain separately installable with
`Install Xcode Template.command`.

## Verification and limits

119 toolkit tests, source/manifest validation and isolated package installation
checks pass. Nineteen website article/template tests pass. All seventeen public
pages were verified, and all 46 outgoing destinations responded successfully after
correcting two Apple documentation links and using the toolkit's public GitHub
repository in place of the site's currently broken `/tool` page.

This is dated publication evidence, not a guarantee that external pages never
change. No independent editorial review, new device testing of every source app,
AI-response benchmark or completed migration benchmark is claimed. Raw founder
notes and private migration evidence are not included. v0.3.2 remains unchanged.

Created by [3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/).
Released under the MIT licence.
