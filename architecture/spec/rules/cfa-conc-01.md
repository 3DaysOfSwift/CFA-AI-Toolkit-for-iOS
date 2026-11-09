# CFA-SPEC-CONC-01: Use MainActor for Features

**Applies when:** Defining a CFA Feature.

**Strength:** Required.

**Guidance:** Isolate Feature owners to MainActor. Underlying microservices use an appropriate isolation boundary off MainActor by default. Keep framework-required MainActor calls in a narrow adapter. A separate type or an async declaration alone does not move work off MainActor.

**Why:** Observable state is coordinated while substantial processing remains responsive.

**Example:** A Feature publishes a decoded schedule returned by a suitably isolated provider.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Trace expensive work to its execution boundary using the project’s Swift language mode, default isolation and relevant SDK annotations. Run responsiveness checks where appropriate.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
