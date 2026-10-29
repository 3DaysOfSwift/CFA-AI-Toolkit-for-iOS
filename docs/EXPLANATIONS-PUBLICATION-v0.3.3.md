# CFA explanation publication — v0.3.3

Verified 29 October 2026. Reviewer: Codex content and rendered-page review.
Matthew Thomas authorised publication; this is not independent technical review
or a claim that he read and approved every sentence.

All seventeen URLs below returned their expected article content without login.
The browser checks covered 1280px desktop and 390px mobile widths, readable
scrolling code, loaded illustrated training footers and no page-wide overflow.
The catalogue stores the exact CMS HTML hash associated with each review.
Website source and detailed evidence were committed as `d83657f`.

| Topic | Public explanation |
| --- | --- |
| `readability` | [Why use descriptive names in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability) |
| `presentation-boundaries` | [Why use a UI and model boundary in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/presentation-boundaries) |
| `view-model-ownership` | [Why use screen-owned ViewModels in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/view-model-ownership) |
| `appmodel-composition` | [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition) |
| `feature-ownership` | [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership) |
| `concrete-features` | [Why use concrete features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features) |
| `persistence-boundaries` | [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries) |
| `storage-failures` | [Why use recoverable storage requests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/storage-failures) |
| `isolation-and-sendable` | [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable) |
| `behavioural-testing` | [Why use behavioural tests in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/behavioural-testing) |
| `preserve-product-behaviour` | [Why use behaviour-preserving migration in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/preserve-product-behaviour) |
| `project-structure` | [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure) |
| `new-app-design` | [Why use opt-in design defaults in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/new-app-design) |
| `honest-errors-and-editing` | [Why use recoverable editing workflows in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/honest-errors-and-editing) |
| `unstructured-tasks` | [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks) |
| `task-cancellation` | [Cancellation is a policy, not a button](https://www.3daysofswiftconcurrency.com/cfa/explanation/task-cancellation) |
| `overlapping-requests` | [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests) |

## Scope and limits

The fourteen rewritten tutorials were reviewed for code-led teaching and
consistency with Features owning authoritative application state on MainActor,
including capabilities with no screen. Services isolate implementation machinery
appropriately; a separate type or async function does not by itself offload work.
The original three concurrency explanations received a consistency/layout review.
Older real-app code is explained as historical source where conventions differ.

All 46 unique outgoing destinations returned HTTP 200 after broken links were
corrected. That is reachability evidence, not technical review of every external
page. The site's `/tool` page returned 404; article toolkit links now lead to its
public GitHub repository. Existing article slugs and CMS identities were retained.

This release does not claim new device tests for every source app, runtime
concurrency benchmarks, independent editorial review or live assistant evaluations.
No raw founder notes, customer code or private migration records are included.
The skills remain useful offline, answer questions directly and offer at most a
relevant optional explanation link; they do not repeatedly advertise training.
