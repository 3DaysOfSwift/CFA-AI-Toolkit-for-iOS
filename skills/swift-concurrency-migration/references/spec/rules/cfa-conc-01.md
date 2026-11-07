# CFA-SPEC-CONC-01: Use MainActor for Features

**Applies when:** Defining a CFA Feature.

**Strength:** Required.

**Guidance:** Isolate Feature owners to MainActor; give underlying work an appropriate isolation strategy and avoid expensive blocking work on MainActor.

**Why:** Observable state is coordinated while substantial processing remains responsive.

**Example:** A Feature publishes a decoded schedule returned by a suitably isolated provider.

**Explanation:** [Why use actors and Sendable values in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/isolation-and-sendable).

**Verify:** Inspect isolation annotations and run responsiveness checks where appropriate.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
