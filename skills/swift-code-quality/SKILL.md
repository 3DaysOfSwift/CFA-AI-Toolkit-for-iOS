---
name: swift-code-quality
description: Create, edit or review high-quality Swift for production apps, examples, Playgrounds and open-source projects. Use whenever Swift code quality, architecture, naming, testing or maintainability matters.
---

# Swift Code Quality

Read [project workflow and design authority](references/project-workflow.md) first.
Respect the recorded workflow and current request; new-app design defaults do
not authorize UI changes during maintenance or a narrowly scoped task.

Read the [Swift coding guide](references/swift-coding-guide.md) before writing or changing Swift.

Build code that a senior iOS engineer can understand from the type names and call flow. Prefer the smallest complete design that meets the stated behaviour. Do not use a folder diagram, a fashionable pattern or hypothetical future flexibility as a reason to add a type.

## Before implementation

Identify, in plain language:

1. The observable behaviour being added or changed.
2. The authoritative owner of each mutable piece of state.
3. The asynchronous operation's creator, owner, cancellation policy and published outcome, when concurrency is involved.
4. Whether an existing type already owns the responsibility.
5. Whether two types have the same properties and functions. If they represent the same information and behaviour without a meaningful enforced distinction, keep one type.

For every new Feature, ViewModel, protocol, actor or persistence type, state one concrete ownership sentence: “This type owns …”. Do not create it if that sentence only says it forwards a call, groups files, or might be useful later.

## Architecture and dependency rules

- A feature owns feature behaviour and durable state. It does not exist merely to complete a CFA-shaped folder.
- A ViewModel earns its existence by owning presentation state or an asynchronous/multi-step UI workflow. A pass-through ViewModel is a defect, not a pattern—unless the active architecture explicitly requires one dedicated ViewModel for every screen.
- A protocol earns its existence only at a real substitution boundary—usually deterministic tests, multiple production implementations, or a public library contract.
- An actor earns its existence by isolating mutable state; it is not a generic “background work” marker.
- SwiftUI environment values are presentation dependencies. Put `ThemeManager` there when it is app-wide. Do not put `AppModel` or features in the environment; use the active architecture's declared composition route for feature dependencies.
- Keep dependency direction visible: View → optional ViewModel → feature → provider/storage. A View may call its feature directly for a trivial intent only when the active architecture permits it. CFA requires View → ViewModel → feature for every screen.
- Name ViewModel methods for the work they perform, not for a UI gesture or lifecycle signal. Prefer `refresh()`, `save()` and `retry()` over `refreshTapped()`, `savePressed()` and `screenAppeared()`.

## Delivery gate

Before delivery, review the actual changed files and remove:

- placeholder language such as “starter”, “sample” or “candidate” from production names unless it describes an intentional user-facing state;
- obsolete files, duplicate models and abandoned code paths;
- types that do not own a distinct responsibility;
- hidden fallbacks that make a failure look successful.

Build the affected target and run relevant tests when the environment permits. If a check cannot run, report the exact blocker rather than claiming success.

For implementation work in a CFA project, also apply the project's CFA-specific skill. This skill is deliberately architecture-neutral and governs Swift quality everywhere: apps, feeds, examples, Playgrounds and open-source repositories.

## Capturing Matt's coding rules

When the developer says **“Add this to Matt’s Swift standards”**, treat the correction as a request to improve the shared standard.

1. State the rule in one precise sentence and explain the concrete failure it prevents.
2. Classify it as a general Swift rule, CFA architecture rule, or repository-specific convention. Do not promote an isolated preference into a universal rule without saying why it generalises.
3. Correct the code that demonstrated the problem when that change is within the current request.
4. Add the reusable rule, reason, short example when useful, and review question to the canonical coding guide.
5. Synchronise the guide to every bundled CFA skill and confirm that the generic skill's copy matches.

Use this workflow for feedback received in any chat. The installed shared skill and its canonical guide are the durable memory; chat history alone is not.
