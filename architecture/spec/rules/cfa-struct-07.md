# CFA-SPEC-STRUCT-07: Organise extensions and domain types by purpose

**Applies when:** Adding Swift extensions or domain values.

**Strength:** Required.

**Guidance:** Follow the specification’s placement rules for extensions. Keep domain types with the Feature that defines their meaning, even when they are Codable or persisted. Keep storage-only records inside the persistence implementation and transport-only payloads inside their provider or adapter.

**Why:** Related types remain understandable independently of storage representation.

**Example:** A launch snapshot belongs with the launch capability rather than being defined by its database schema.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Read declarations and trace callers to identify who defines the type’s meaning. Follow both conversion boundaries: providers translate wire payloads and repositories translate storage records into domain values. Check that these representations stay inside their owners. When moving files, verify the physical path, Xcode navigator, target membership and resource lookup. Update path-dependent scripts and build and test the affected targets.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
