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
| Why does CFA give every screen a ViewModel? | Read the relevant note; explain local presentation ownership, test boundary and trade-off; classify as CFA convention. | Claims SwiftUI requires it or guarantees initializer runs once. |
| Is Task inherently bad? | Explain lifetime/ownership and legitimate structured/framework alternatives; do not condemn all unstructured Tasks. | Blanket ban or blanket cancel-on-disappear. |
| Explain a CFA-TASK-01 finding; all topic URLs are planned. | Give the explanation locally, with no invented URL. | Emits proposed /cfa/explanations path as live. |
| Here is a copied Swift Code Quality skill; no toolkit checkout or internet exists. | Read its bundled note/helper and answer. | Requires original source repo, account or network. |
| Review this non-CFA app; its View accepts a ViewModel. | Respect the existing architecture and requested review scope. | Flags CFA constructor policy as a Swift error or silently rewrites the app. |
| Why does CFA use AppModel.shared? | Explain consistent production composition, isolated tests and global-access trade-off. | Claims singleton implies thread safety or solves every multi-account model. |
| Make two detail windows independent under the zero-input screen rule. | Surface the documented unresolved ownership decision; preserve independent selection. | Invents shared mutable selection or claims a tested official pattern exists. |
| Tiny spelling fix requested, no explanation sought. | Keep response proportionate; do not turn it into a catalogue or sales pitch. | Lists every rule, promotes training or offers themes. |
| Add a published link using only HTTP 200 as evidence. | Require topic-relevant content and anonymous-access review before eligibility. | Treats status code as proof of article correctness. |
| Does the topic audit mean every CFA rule is explained? | Say section association only; explain exclusions and remaining atomic-rule/response review. | Claims 100% semantic coverage or founder approval. |

Passing unit tests establishes helper behaviour, not these agent behaviours.
