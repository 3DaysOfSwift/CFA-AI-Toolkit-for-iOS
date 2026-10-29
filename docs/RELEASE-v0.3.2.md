# CFA AI Toolkit for iOS — v0.3.2

This release clarifies what a Feature owns and gives all eight AI skills a shared
reference for explaining CFA's design decisions. It also separates runnable
Starter Apps from installable Xcode templates.

## Clearer Feature boundaries

A CFA Feature owns the authoritative application state for a business capability
and exposes the operations that manage it. Features are isolated to the main actor
and made available through AppModel, independently of which screens use them.

- A screen can present several independent business capabilities. There is no
  requirement to create one Feature per screen or tab.
- A growing ViewModel should be examined for responsibility: is it arranging
  existing capabilities for the screen, or implementing a new business capability?
  Only the latter points towards extracting business behaviour into the model.
- Lower-level services may retain internal request tracking, caching or database
  machinery. Those implementation details are not competing business authorities
  and do not automatically become Features.
- New apps start with independent Features. A composed Feature is an explicit
  architectural extension justified by a business responsibility. Preserve
  existing behaviour when reviewing or migrating established apps.

These are CFA conventions, not additional requirements imposed by Swift or SwiftUI.
This release does not automatically refactor an installed user's application.

## Explanations available inside the toolkit

The shared catalogue maps rules to 17 local design-decision notes covering
AppModel, Feature ownership, ViewModels, concurrency, persistence, testing and
product preservation. Each skill can explain a relevant decision directly and
distinguish documented or confirmed rationale from editorial trade-offs.

Public links are offered only when publication and content review have been
recorded. Website tutorial revisions remain a separate review/publication workflow;
this release does not claim that those drafts are live. Raw founder notes and
private migration records are not included.

## Other changes since v0.3.1

- Runnable Habit Tracker, Habit Tracker Pro and Todays Twenty projects now live
  under Starter Apps. Native Xcode templates remain under templates/Xcode.
- Release archives exclude local Xcode user state and build output.
- More explicit inline screen-ViewModel ownership checks and manual-review limits.
- App identity and orientation verification helpers for new projects.
- Stronger migration completion evidence and preservation of existing behaviour.

## Download and install

Download **ios-app-development-cfa-0.3.2-plugin.zip**, extract it and run
`Install.command`, or use `node scripts/install.mjs`. Existing managed installations
can use `node scripts/install.mjs --replace`; the installer backs up an unmodified
managed installation and refuses to overwrite edited or unrelated files.

Node.js 20+ is required. No npm dependencies or PyYAML are required. Install native
Xcode templates separately using `Install Xcode Template.command`. The source ZIP
is for contributors. `SHA256SUMS` covers both archives.

## Verification and limits

The release passes 117 automated tests and canonical-reference/manifest validation.
The tests exercise portable installation in temporary destinations, packaged
explanation lookup, migration evidence and inspector behaviour. Both release
archives are built and checksummed from the release source.

These checks do not establish end-to-end performance of an AI assistant or a
completed migration benchmark. Manual agent-evaluation cases are provided as
evaluation guidance, not reported as executed independent trials. No new Xcode
runtime validation of every Starter App is claimed for this documentation release.

Created by [3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/).
Released under the MIT licence.
