# CFA-SPEC-CONST-01: Define shared constants when needed

**Applies when:** A meaningful app-wide value is shared or repeated.

**Strength:** Default.

**Guidance:** Define genuinely shared constants once as static properties on a purpose-named enum when they are needed. Add a constants enum only when a genuinely shared value needs it. App-wide system constants may live in a purpose-named folder beside AppModel. Keep Feature-specific values with their owner. Read app identity from bundle metadata when it is authoritative and use localization resources for translatable text. Keep secrets out of app constants.

**Why:** A single definition avoids inconsistent copies while keeping related code easy to find.

**Example:** An AppLinks enum holds the shared company website and support email address.

**Verify:** Check repeated uses, ownership, bundle metadata, localization and that no secrets are embedded.

**Full rule, context and examples:** [Make the Architecture Visible in the Folder Structure](../topics/12-make-the-architecture-visible-in-the-folder-structure.md). This card is a reading aid; apply the complete canonical section.
