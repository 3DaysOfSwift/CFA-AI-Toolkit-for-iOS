# CFA-SPEC-NET-01: Let independent requests progress

**Applies when:** Designing network services.

**Strength:** Required unless a documented policy limits concurrency.

**Guidance:** Prefer a simple stateless NetworkingManager when suitable; do not assume an actor serializes an entire suspended request.

**Why:** Avoid accidental bottlenecks and data races.

**Example:** Independent launch providers initiate requests without waiting for another provider to finish.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Test overlapping requests and inspect isolation, request limits and URLSession configuration.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
