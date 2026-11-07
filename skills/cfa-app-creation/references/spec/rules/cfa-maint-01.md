# CFA-SPEC-MAINT-01: Prefer straightforward change

**Applies when:** Implementing or migrating code.

**Strength:** Default.

**Guidance:** Choose the simplest structure that preserves necessary behaviour, ownership and safety.

**Why:** Fewer unnecessary layers improve comprehension and maintenance.

**Example:** A sign-out workflow uses direct Feature calls instead of a new event bus.

**Explanation:** [Why use descriptive names in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability).

**Verify:** Trace the whole workflow and remove scaffolding with no demonstrated purpose.

**Full rule, context and examples:** [Prefer Readable Domain Language over Architectural Ceremony](../topics/27-prefer-readable-domain-language-over-architectural-ceremony.md). This card is a reading aid; apply the complete canonical section.
