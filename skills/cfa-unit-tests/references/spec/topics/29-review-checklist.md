## Review Checklist

Before accepting a change, answer every question:

1. Can the folder location alone explain which layer owns every new type?
2. Does every unique screen have its own adjacent ViewModel?
3. Does each screen retain its own ViewModel in a private `@State` property
   named `viewModel`, with state scoped to that screen’s SwiftUI identity?
4. Can every View be created without receiving a ViewModel, AppModel, Feature,
   or repository, and do screen Views avoid receiving another screen’s actions?
   Reusable presentation components may receive action closures.
5. Is each business decision owned by its Feature? Can supporting Model
   helpers perform calculations or infrastructure work without becoming a
   competing authority for that decision or its state?
6. Would an Apple Watch app be able to reuse the decision without copying UI
   code?
7. Does each ViewModel depend on the smallest coherent set of concrete
   Features needed by its screen?
8. Does AppModel assemble and expose Features, own app-wide listener tasks,
   and limit coordination to genuinely application-wide responsibilities?
9. Is persistence accessed through repository protocols, and are other
   external-system details handled by appropriate microservices?
10. Are async operations directly testable? Does each unstructured task have
    an explicit owner and a retained handle when needed? Do structured children
    and framework-owned lifecycle tasks stay with their existing owners, with
    no Task handles stored by a View?
11. Has required concurrency behaviour been preserved rather than simplified
    away?
12. Are time-dependent business rules deterministic in tests?
13. Does every ViewModel have its own focused test suite?
14. Can a junior developer read the names as plain English without learning the
    entire object graph first?
15. Was every new abstraction earned by a concrete responsibility?
16. Does each piece of shared state have one authoritative owner and mutate only
    through named feature commands?
17. Can every meaningful Task lifetime—durable, replaceable, presentational, or
    long-lived—be explained and managed appropriately?
18. Is expensive work kept away from the Main Actor while observable results
    return to it safely?
19. Are failures, partial loading, offline persistence, and retry behaviour
    represented honestly?
    - For durable edits, does the Feature publish the saved value only after
      required persistence succeeds, leaving the draft available on failure?
    - For replaceable downloads, can refresh proceed independently of cache
      restoration and complete without waiting for an optional cache write?
      Can a late restore overwrite fresher data, or a failed refresh discard
      valid data? Both should be prevented.
20. Are domain types stored with the feature that owns their meaning?

Every applicable answer must be yes. Marking a question not applicable requires
a short explanation. Otherwise, the change is not architecturally complete.
