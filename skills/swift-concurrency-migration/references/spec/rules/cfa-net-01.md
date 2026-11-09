# CFA-SPEC-NET-01: Let independent requests progress

**Applies when:** Designing network services.

**Strength:** Required unless a documented policy limits concurrency.

**Guidance:** Wrap URLSession calls in a NetworkingManager and let independent requests progress in parallel unless a documented policy limits them. For new apps, prefer a stateless value type when suitable. An actor may protect shared request state without serializing entire suspended requests.

**Why:** Avoid accidental bottlenecks and data races.

**Example:** Independent launch providers initiate requests without waiting for another provider to finish.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Hold the first response open in a controlled transport and verify that an independent request reaches the transport before the first finishes. Check isolation, request limits and URLSession configuration. Measure suspected bottlenecks before changing the design.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
