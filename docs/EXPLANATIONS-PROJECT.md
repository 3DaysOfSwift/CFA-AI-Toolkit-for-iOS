# CFA explanations and decision rationale

Target release: **0.3.2**, pending release verification and approval to publish.
Project owner: Matthew Thomas. Started 27 October 2026.

## Outcome

Developers can ask a lightweight question or use an ordinary CFA prompt.
The toolkit explains its relevant decisions, distinguishes Swift semantics
from CFA choices, and optionally links to a genuinely useful free explanation.
It works offline and never requires a user to read marketing material.

## What is implemented

- Seventeen substantive decision notes with rules, problems, documented
  rationale, explicitly labelled editorial trade-offs, scope, verification
  checks and unresolved questions.
- Stable topic and rule IDs, canonical source-section associations, proposed
  CMS routes and publication verification state in one catalogue.
- A section audit and reproducible editorial priority calculation.
- An offline lookup helper and relevant-topic routing in all eight skills.
- Packaging and validation of the notes and helper in each standalone skill.
- Tests of link eligibility, wrong keys, malformed metadata, coverage gaps
  and standalone operation.

Canonical files are [the explanation guide](../architecture/explanations/guide.md)
and [catalogue](../architecture/explanations/catalogue.json).
Run `npm run explanations:audit` to regenerate the current coverage report.

## Initial audit and its limits

The audit inventories 66 H2/H3 sections outside code fences in the CFA
specification and Swift coding guide. 58 sections are associated with topic
notes; eight contextual/reference/summary sections have explicit exclusions.
There are no unassociated sections in that initial inventory.

This is **section association**, not a claim that every sentence, bullet,
skill-specific instruction or inspector diagnostic has its own complete
rationale. The specification's Prohibited Patterns and Review Checklist are
aggregate summaries, explicitly excluded from this section count. An atomic
rule review and real response evaluation remain separate work.

The stable rule IDs name the propositions summarised by each note. They are
not existing inspector codes and do not claim automatic detection. Inspectors
still need manual source verification. No collection of user prompts or
question-frequency telemetry has been introduced.

Priority uses `2 × impact + confusion + reach`, with scores 1–3 chosen
editorially. Several topics tie at 12; that does not establish their popularity.
Occurrence counts remain unknown. Start publication with unstructured tasks,
task cancellation and overlapping requests: they form one coherent learning
sequence. Then cover storage failures, ViewModel ownership and AppModel.

## Provenance agreement

Matthew Thomas approved describing existing written benefits as documented
rationale while labelling new trade-off discussion as editorial analysis.
That approval was given on 27 October 2026. It does not establish his historical
consideration of alternatives or approve every individual claim.

Do not turn a draft explanation into a new rule. Change the specification first
when an architectural decision actually changes, then update related notes and
skills. The public article explains that decision rather than becoming a
competing source of architectural instructions.

## Decisions to resolve with Matthew

1. **Independent destinations:** a worked zero-input screen design for two
   detail windows showing different records without one global selection.
2. **Graph scope:** how CFA should describe multi-account/document-scoped
   products while retaining explicit shared production composition.
3. **Evidence:** which real migrations or investigations are approved for
   publication, and what claims their recorded results actually support.
4. **Examples:** which minimum iOS/Swift/Xcode configurations the first
   runnable public examples should verify.

The notes retain additional topic-specific questions. They are an editorial
backlog, not questions that every toolkit user must answer.

## CMS delivery

Reuse the custom CMS article design, highlighted code and compact training
card. This is not Wix Blog. The current premium article implementation uses
`TSPLBookRevisionGuide`; the separate free explanation collection must reuse
the presentation without inheriting premium access restrictions or changing
existing /blog routes.

Proposed index: `/cfa/explanations`.
Proposed item route: `/cfa/explanations/{slug}`.

Matthew authorised creation and publication of the free library and explicitly
requested a new CMS table. Created **CFA Explanations** (`CFAExplanations`) on
2026-10-27, in site `c7e3c2f2-fc81-4857-8187-520baa199cb5`. The successful create
response confirmed revision 1 and public read access, with administrative
write permissions. The premium collection was not changed.

Fields: `title`, `slug`, `summary`, `tutorialHtml`, `authorName`, `ruleIds`,
`topic`, `rationaleStatus`, `sourceReferences`, `seoTitle`, `metaDescription`,
`lastUpdatedDate`, and `sortOrder`. Match updates by stable topic slug and the
recorded CMS item ID; never insert duplicates on a repeated upload.
`tutorialHtml` is text, matching the existing custom HTML rendering approach.
Keep unpublished drafts and internal provenance notes outside this public
collection; hiding a record in the page UI would not make its data private.

Three articles were uploaded on 2026-10-27: unstructured tasks, task
cancellation and overlapping requests. Read-back confirmed all three saved
HTML values exactly match the upload. Delivery files and CMS identities are
recorded in the sibling `../cfa-explanations/` output directory (relative to
the toolkit repository root). Its Item-page script is prepared but has not
been installed in Wix. Nine content/renderer tests pass; the three complete
Swift examples type-check with Swift 6, using a compile-only support harness.
These checks are not runtime concurrency tests or a live Wix rendering check.

Wix currently generates item links at `/cfa/explanation/{slug}` (singular),
with list-link fields for both `/cfa/explanation` and `/cfa/explanations`.
Reconcile the intended routes before marking catalogue links published.
CMS insertion alone does not install page code or publish the site.

For each article: write from the note, include a recognisable problem and
corrected example, state trade-offs and verification, distinguish CFA from
Swift, and put any scope note after the training card. Respect the approved
article template and do not reuse an existing CMS item identity.

No explanation page has been verified published. Proposed paths must not be emitted as
live links. After authorized publication, check anonymous access, full topic
content, code formatting, navigation, canonical path and related destinations.
Record actual URL, date, reviewer and specific relevance in the catalogue.
An HTTP response or a validator success alone is insufficient.

## Release gates

- [x] Source-grounded initial rationale notes and catalogue.
- [x] Offline skill lookup and unpublished-link suppression.
- [ ] Resolve or explicitly retain the high-impact editorial questions.
- [ ] Complete realistic host response evaluations; fixtures are not execution.
- [ ] Publish and visually verify the first CMS explanations with authorization.
- [ ] Add their verified links and rerun lookup/publication tests.
- [ ] Review all pre-existing uncommitted changes for the release.
- [ ] Run full tests, source validation and isolated release packaging.
- [ ] Authorize, commit/tag/push/publish, then install the release.

The offline rationale increment can ship without public explanations only if
release notes explicitly say that no new explanation URLs are live. A release
advertised as linking to the new library requires the publication gate above.
