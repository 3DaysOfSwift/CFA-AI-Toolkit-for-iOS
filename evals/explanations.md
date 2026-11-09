# Explanation response evaluation

## Feature-boundary clarification cases (v0.3.2)

These are manual evaluation inputs and expected review criteria, not executed
agent trials or automated proof of semantic correctness.

- A Settings screen uses SettingsFeature and UserProfileFeature. Accept both
  dependencies; do not create a combined Feature solely to hide the count.
- A feed provider returns pages while PostFeedFeature owns posts, cursor and
  loading state. Keep one business authority; inspect stale-result and pagination
  policy without introducing a duplicate in-memory feed cache.
- A networking actor retains in-flight requests and an image cache. Keep this
  implementation state below the Feature boundary rather than exposing every
  stateful helper through AppModel.
- A watch ViewModel selects a compact arrangement of existing book/progress data.
  Keep device presentation in presentation. If it starts defining which books
  satisfy a daily learning goal, identify that business rule for model extraction.
- An existing TodayFeature composes other Features. Preserve behaviour and assess
  its business responsibility as an architectural extension; do not mechanically
  remove it to apply a new-app starting rule.

These are manual host-evaluation cases, not executed test results. Run with the
packaged skill in an isolated workspace. Record host/model, plugin version,
prompt, actual output and pass/fail evidence outside a customer's app.
No case authorizes app edits, publication, telemetry or a real purchase.

| Prompt / context | Expected behaviour | Failure |
|---|---|---|
| Why does CFA give each SwiftUI screen a ViewModel? | Read the relevant note; explain local presentation ownership, test boundary and trade-off; classify as CFA convention. | Claims SwiftUI requires it or guarantees initializer runs once. |
| Is Task inherently bad? | Explain lifetime/ownership and legitimate structured/framework alternatives; do not condemn all unstructured Tasks. | Blanket ban or blanket cancel-on-disappear. |
| Explain a CFA-TASK-01 finding in an isolated fixture where the relevant article is planned and no other eligible link exists. | Explain task ownership using the bundled rationale. | Presents the proposed path as a live article. |
| Explain a CFA-TASK-01 finding when the catalogue contains a relevant verified article and an unrelated verified article. The developer asks for further reading. | Explain the finding directly and link to the relevant verified article. | Substitutes the unrelated article or gives a link without answering the question. |
| Here is a copied Swift Code Quality skill; no toolkit checkout or internet exists. | Read its bundled note/helper and answer. | Requires original source repo, account or network. |
| Review this non-CFA app; its View accepts a ViewModel. | Respect the existing architecture and requested review scope. | Flags CFA constructor policy as a Swift error or silently rewrites the app. |
| Review a UIKit screen retained during a CFA migration. | Trace its actual presentation owner to the Features and named tests. Preserve the existing presentation scope. | Requires SwiftUI private State or a replacement ViewModel solely because the route is a screen. |
| Check the concurrency of this one save workflow. | Give source-backed findings for that workflow and distinguish CFA alignment from concurrency correctness. | Labels the result a completed whole-app Health Check or assigns an overall app score. |
| Review a CFA screen that declares `@State private var reminders = RemindersViewModel()`. | Recognize that the screen owns the ViewModel. Report the property name separately and recommend `viewModel`. | Reports missing ownership or treats the inspector’s ownership result as proof the property name follows CFA. |
| Why does CFA call AppModel startup synchronously from the app delegate? | Explain that the delegate signals AppModel immediately. AppModel signals the relevant Features and starts required app-wide listeners before returning. Features can own asynchronous work without making launch wait for disk or network completion. Distinguish task scheduling from actual I/O initiation. | Claims iOS requires this architecture, that first-frame rendering waits for Feature results, or that task creation order guarantees network start order. |
| Why does CFA use AppModel.shared? | Explain consistent production composition, isolated tests and global-access trade-off. | Claims singleton implies thread safety or solves every multi-account model. |
| Make two detail windows independent for different selected items. | Pass each selected immutable snapshot to its detail View and initialize that View’s own State-backed ViewModel; preserve independent selection and verify destination identity. | Forces a zero-input detail View, stores UI selection in a shared Feature, or claims separate scenes were runtime-tested without evidence. |
| The pull-to-refresh indicator disappears while the Feature keeps downloading. The ViewModel returns a Task handle. | Trace what the refresh closure awaits. Await the handle's value and verify the indicator remains active while the screen waits. Treat cancellation of the screen's wait separately from ownership of shared work. | Starts a second request, claims awaiting the handle makes it a child task, or cancels a shared refresh when its last screen leaves without a product reason. |
| Two screens edit different records from the same starting list. Why can one edit disappear even though the repository is an actor? | Explain how replacing the collection from a stale caller snapshot can lose a write. Persist each change by stable record identity and verify both survive reopening. | Claims actor serialization prevents stale collection replacement or verifies only the in-memory list. |
| My `#Preview` builds a SwiftData container and passes it to the Notes screen. Is that CFA? | Show a preview that constructs `NotesView()`. Explain that the screen constructs its own ViewModel, the ViewModel resolves its Feature, and persistence remains behind the Feature. | Puts SwiftData setup or ViewModel injection in the preview, or requires a separate preview graph for an ordinary preview. |
| Where does an unsaved note live after Save fails? | Explain that the screen ViewModel retains the draft for retry while the Feature keeps the last confirmed state. Cancelling discards the draft, and a successful save publishes the confirmed data. | Places the draft in a shared Feature, loses it on failure, or publishes it as saved before persistence succeeds. |
| The server returned a fresh schedule, but saving its local cache failed. Should refresh fail like a failed user edit? | Explain that the server response is authoritative. Publish it and complete the caller independently of caching. Keep the last usable cache, use bounded retries and describe offline availability according to what was saved. Contrast with a durable user edit, which becomes confirmed after persistence succeeds. | Holds the refresh open for disk, reports download failure after the server succeeded, or reports the unsaved snapshot as available offline. |
| Tiny spelling fix requested, no explanation sought. | Keep response proportionate; do not turn it into a catalogue or sales pitch. | Lists every rule, promotes training or offers themes. |
| Add a published link using only HTTP 200 as evidence. | Require topic-relevant content and anonymous-access review before eligibility. | Treats status code as proof of article correctness. |
| Does the topic audit mean every CFA rule is explained? | Say section association only; explain exclusions and remaining atomic-rule/response review. | Claims 100% semantic coverage or founder approval. |

Passing unit tests establishes helper behaviour, not these agent behaviours.
