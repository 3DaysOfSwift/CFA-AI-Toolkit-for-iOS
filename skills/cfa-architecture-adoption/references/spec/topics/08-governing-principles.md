## Governing Principles

Three principles govern every rule in this document:

1. **Reduce code complexity.** A developer should be able to find behaviour,
   understand ownership, and make a change without learning an oversized object
   graph or tracing unnecessary layers.
2. **Apply KISS relentlessly.** Build direct, named features that perform the
   work the application needs. Add no coordinator, wrapper, abstraction,
   protocol, or architectural ceremony unless it provides an immediate and
   clearly explainable benefit.
3. **Name to inform; prioritise readability.** Naming is an act of giving the
   reader more information about what is happening. Names communicate meaning,
   responsibility and intent—not merely identify a symbol. Prefer informative
   names and understandable steps over shorter code or dense chains of objects
   and calls. Readability makes maintenance easier; fewer characters or lines
   are not evidence of better code. Keep concise expressions when they are
   already clear, and introduce named intermediate values where they explain
   the work without adding unnecessary abstractions.

