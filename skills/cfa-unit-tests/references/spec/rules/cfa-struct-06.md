# CFA-SPEC-STRUCT-06: Validate device orientation configuration

**Applies when:** Creating an iOS app or preparing its archive.

**Strength:** Required.

**Guidance:** Declare supported orientations in each configuration and inspect the built or archived Info.plist; honour explicit product choices.

**Why:** A simulator build alone does not prove archive configuration or layout compatibility.

**Example:** A universal app declares appropriate iPhone and iPad orientations.

**Explanation:** [Why use an ownership-based project structure in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/project-structure).

**Verify:** Build Release for a generic iOS device and inspect the built orientation arrays. When preparing an archive, inspect its app plist too. Exercise supported rotation and iPad resizing before claiming UI compatibility.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
