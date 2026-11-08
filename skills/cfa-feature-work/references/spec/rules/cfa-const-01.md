# CFA-SPEC-CONST-01: Define shared constants when needed

**Applies when:** A meaningful app-wide value is shared or repeated.

**Strength:** Default.

**Guidance:** Do not create a constants container speculatively; define genuinely shared values once as static properties on a purpose-named enum, keeping Feature-specific values with their owner.

**Why:** A single definition avoids inconsistent copies while keeping related code easy to find.

**Example:** An AppLinks enum holds the shared company website and support email address.

**Verify:** Check repeated uses, ownership, bundle metadata, localization and that no secrets are embedded.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
