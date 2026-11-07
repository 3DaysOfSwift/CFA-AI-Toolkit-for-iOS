## Layered Architecture

The governing dependency flow is:

```text
View
  ↓
ViewModel
  ↓
Feature
  ↓
Microservices
```

User intent moves down through the layers and state or results flow back up. A
View reports intent to its ViewModel, the ViewModel calls the concrete Feature,
and the Feature applies the application's rules. Its internal microservices,
such as networking, data-storage and device API adapters, interact with local
storage, remote servers or system APIs when the capability needs them. These
are supporting code inside the app, not necessarily separately deployed server
applications. The Feature's API is its
exposed methods and state, not a separate layer. AppModel constructs and makes
Features available; it is not a separate step in every operation.

Keep this route short, but never bypass an established owner for convenience.
Doing so places knowledge in the wrong type: a View begins to understand
persistence, a ViewModel duplicates business rules, or a Repository decides
application behaviour. Do not add layers for their own sake; use the fewest
layers needed while keeping every responsibility clear, testable, and easy to
find.

**Keep single-app code in the app target.**

For a new app, keep first-party application code in the app target and use
purpose-named folders to communicate ownership. Do not create a local Swift
package merely to group code, mimic a folder, or prepare for hypothetical reuse.
A single-app project can be cleanly organized without introducing another module.

Encapsulation alone is not sufficient reason to extract app-owned code into a
separate module. A team working across the whole app must still understand, debug
and change that implementation; additional imports, access-control declarations,
targets and dependency configuration can add friction. Prefer clear Feature
ownership, appropriate access control and purpose-named folders within the app
target unless a separate boundary provides a concrete benefit that outweighs
those costs.

Introduce a separate package only for a clear, current need, such as code shared
across multiple apps or a demonstrable independent distribution or build
boundary. Explain the benefit and costs. For existing projects, respect their
established boundaries and the requested scope; do not automatically remove or
create packages as an unrelated cleanup. Evaluate each possible consolidation
against actual consumers, resources, tests, generated code, and build settings.
Measure runtime or build performance before claiming a package boundary helps
or hurts it.

