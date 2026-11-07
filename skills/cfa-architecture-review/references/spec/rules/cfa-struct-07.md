# CFA-SPEC-STRUCT-07: Organise extensions and domain types by purpose

**Applies when:** Adding Swift extensions or domain values.

**Strength:** Required.

**Guidance:** Follow the specification’s placement rules for extensions and keep domain types with their semantic owner.

**Why:** Related types remain understandable independently of storage representation.

**Example:** A launch snapshot belongs with the launch capability rather than being defined by its database schema.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Review extension and type ownership against the full source section.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
