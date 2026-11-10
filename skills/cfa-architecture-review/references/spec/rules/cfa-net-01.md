# CFA-SPEC-NET-01: Let independent requests progress

**Applies when:** Designing network services.

**Strength:** Required unless a documented policy limits concurrency.

**Guidance:** Start URLSession requests through a lower-level NetworkingManager. Composition code may configure and inject a session. Feature-specific API adapters validate and decode responses. AppModel may construct the manager in live() for injection without storing it as an AppModel property. Let independent requests progress in parallel unless a documented policy limits them. For new apps, prefer a stateless value wrapper when suitable. Copies can use the same injected URLSession. An actor may protect shared request state and admit another request when the first suspends. Keep synchronous actor work brief and avoid waiting for an unrelated response before starting a request.

**Why:** Avoid accidental bottlenecks and data races.

**Example:** Independent launch providers call NetworkingManager for transport and decode their own responses. A provider can start its request while another response is pending.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Hold the first response open in a controlled transport and verify that an independent request reaches the transport before the first finishes. Trace the caller’s task structure and check Sendable conformance, default isolation, request limits and URLSession configuration. A value wrapper’s allocation depends on how it is used. Measure suspected bottlenecks before attributing them to isolation or allocation.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
