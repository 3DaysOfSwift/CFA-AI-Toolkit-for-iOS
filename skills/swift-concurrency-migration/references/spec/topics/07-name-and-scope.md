## Name and Scope

The product is **CFA AI Toolkit for iOS**. Use that exact name for the toolkit
and plugin in public-facing titles, descriptions, documentation and messages.
The architecture is **Cooperative Feature Architecture (CFA)**, shortened to
**CFA**. The toolkit supplies skills, tools and templates that apply CFA; the
architecture itself is not the toolkit. Keep descriptive component names such
as CFA Inspector and CFA App distinct from the product name.

Stable package/plugin identifiers, command names, asset filenames and installer
ownership markers are compatibility contracts, not display branding. Do not
rename them merely to update wording. Historical names may appear when clearly
identified as historical or needed to explain an upgrade.

CFA groups coherent feature state and behaviour behind narrow APIs and explicit
owners. “Cooperative” describes how features collaborate. Swift’s cooperative
runtime is a separate concept: Swift Concurrency does not mandate feature-based
architecture. CFA does not require one actor per feature or all feature code in
one class. Keep the documented ViewModel, feature, worker and repository boundaries.

This is an application architecture, not a runtime framework dependency. Its
skills assist construction, migration and review; they do not prove correctness.

