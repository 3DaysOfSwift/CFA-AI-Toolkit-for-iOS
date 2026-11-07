## Prefer Readable Domain Language over Architectural Ceremony

Architecture exists to make behaviour easier to find and change. Do not add a
factory, router, lifecycle manager, coordinator, service locator, use-case type,
or protocol merely because such a type is fashionable.

Add a layer only when it owns a stable and explainable responsibility. Remove a
layer when its name is more substantial than its contribution.

Comments explain ownership, non-obvious trade-offs, concurrency invariants, and
why a decision exists. They do not narrate obvious syntax.

Commercial Views keep display strings localisation-ready, support Dynamic Type,
provide meaningful accessibility labels, and respect Reduce Motion. Domain
values are never stored as already-localised display strings.

The goal is that a junior developer can follow one clear sentence:

```text
The View reports an intention to its ViewModel; the ViewModel asks the relevant Feature;
the Feature applies the business rules and uses a Repository when data persists.
```

