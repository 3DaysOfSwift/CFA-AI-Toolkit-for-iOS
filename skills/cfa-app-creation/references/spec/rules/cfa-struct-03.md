# CFA-SPEC-STRUCT-03: Keep the template layout and assets correct

**Applies when:** Creating or editing the CFA Xcode template.

**Strength:** Required.

**Guidance:** Keep App.swift, the root asset catalog and app resources in their prescribed locations and maintain Xcode navigator references.

**Why:** A template must produce a usable project with the expected structure.

**Example:** A StoreKit configuration stays in App Resources and remains linked from its scheme.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Run the template structure verifier and inspect a generated project.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
