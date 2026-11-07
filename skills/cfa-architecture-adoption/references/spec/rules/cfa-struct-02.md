# CFA-SPEC-STRUCT-02: Maintain template and resource membership

**Applies when:** Editing project layout or templates.

**Strength:** Required.

**Guidance:** Preserve the Xcode template layout contract, resource lookup and target membership.

**Why:** A correct folder tree is not sufficient if Xcode does not compile or bundle the files.

**Example:** A migrated Feature is moved into its proper folder and retained in the intended target.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Inspect the project and build all affected targets.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
