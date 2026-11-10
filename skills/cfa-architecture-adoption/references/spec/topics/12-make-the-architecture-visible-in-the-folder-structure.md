## Make the Architecture Visible in the Folder Structure

Use this top-level reading order:

```text
Application
├── 1 - View
│   ├── App.swift
│   ├── AppInformation.swift
│   ├── Theme
│   │   ├── AppColourTheme.swift
│   │   └── ThemeManager.swift
│   ├── SwiftUI Extensions
│   │   └── HabitErrorAlert.swift
│   └── Views
│       └── Feature Screen
│           ├── FeatureScreenView.swift
│           └── FeatureScreenViewModel.swift
├── 2 - AppModel
│   ├── AppModel.swift
│   ├── Features
│   │   └── Feature Name
│   │       ├── FeatureNameFeature.swift
│   │       └── Feature-owned domain types
│   └── User Data Storage
│       ├── Protocols
│       ├── Local
│       ├── CloudKit
│       └── Networking
├── 3 - App Resources
│   ├── PrivacyInfo.xcprivacy
│   ├── Purchases.storekit (when local StoreKit testing is used)
│   └── Application.entitlements
├── 4 - Swift Extensions
│   └── Type+Capability.swift
├── Assets.xcassets
└── ApplicationTests
    ├── View model tests
    ├── AppModel tests
    └── FeatureTests
        └── Feature Name
            └── FeatureNameFeatureTests.swift
```

The Xcode navigator must communicate the design without requiring a developer
to inspect source files.

Every new CFA app includes a Settings screen, its adjacent
`SettingsViewModel.swift`, and `SettingsFeature.swift` exposed through
`AppModel.shared.settingsFeature`. Settings is a screen even when its first
version only selects a colour theme; do not collapse it into a data-only
component or call its feature a manager.

### Settings About Section and CFA Footer

See [new-app design defaults](../../new-app-design-defaults.md#settings-about-section-and-cfa-footer).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](../../project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Xcode Template Layout Is a Contract

For a CFA Xcode template, the on-disk path and the Xcode navigator group are
both part of the architecture. CFA follows Xcode's own app-project conventions:

- `App.swift` is in `1 - View`.
- `Assets.xcassets` stays at the app target's top level. It is Xcode's special
  asset catalog and owns the AppIcon build setting.
- Privacy manifests, entitlements and local StoreKit files are in
  `3 - App Resources`.

Do not create a second CFA asset catalog or override Xcode's inherited asset
generator. In `TemplateInfo.plist`, every CFA-owned resource needs a matching
`Path`, single-string `Group`, and `Nodes` entry. The starter's
`PrivacyInfo.xcprivacy` ensures `3 - App Resources` is a real navigator group,
not an empty visual convention.

Toolkit maintainers must run `node scripts/verify-xcode-template-structure.mjs`
after changing the CFA App Xcode template. A template is incomplete if its
generated navigator does not match this folder map.

StoreKit test configuration files (`.storekit`) belong in `3 - App Resources`
on disk and in the navigator, rather than loose at the project root. When
creating or moving one, keep the scheme’s StoreKit configuration reference in
sync. These development-only files should not be added to Copy Bundle Resources.

Independent reusable Views belong in their own clearly named files. Do not place
unrelated components in another View’s file simply because they are small.
Colocation is appropriate for private implementation details used only by that
View, not independently reusable components.

### Mandatory Initial App Icon

See [new-app design defaults](../../new-app-design-defaults.md#mandatory-initial-app-icon).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](../../project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Strict No File Dumping Policy

Do not create vague dumping-ground folders such as `Helpers`, `Utilities`,
`Services`, `Common`, or `Managers`. Every folder must describe the specific
responsibility of the files it owns. If a file has no obvious destination,
clarify its responsibility rather than hiding it inside a generic collection.

### Colour Theme

See [new-app design defaults](../../new-app-design-defaults.md#colour-theme).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](../../project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### System Launch Appearance

See [new-app design defaults](../../new-app-design-defaults.md#system-launch-appearance).
This is a new-product starting point, not an existing-product conformance rule.
Follow [project workflow and design authority](../../project-workflow.md); preserve
user-approved designs and do not repeatedly offer optional visual changes.

### Supported Orientations and Archive Validation

Every new iOS app must explicitly declare supported interface orientations in
every app build configuration, including Release. For a universal app, default
to portrait and both landscapes on iPhone, and all four orientations on iPad.
Honour an explicit iPhone orientation choice while retaining all four iPad
orientations when iPad multitasking is supported. Do not set `UIRequiresFullScreen`
or remove iPad support merely to silence a validation warning.

With generated Info.plist files, set `INFOPLIST_KEY_UISupportedInterfaceOrientations`
and the iPad override `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad`.
Check the resulting app's `UISupportedInterfaceOrientations` and
`UISupportedInterfaceOrientations~ipad` arrays, not just the project settings.
For a source Info.plist, declare those arrays directly.

Before delivery, build Release for a generic iOS device and inspect its built
Info.plist. When preparing an archive, check the plist inside the archived app
as well. Treat orientation validation warnings as defects; a successful simulator
build does not establish App Store eligibility. Exercise supported layouts in
portrait, landscape and iPad resizing before claiming UI compatibility.

Reference: [Apple supported interface orientations](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedinterfaceorientations).

### Swift Extensions

Reserve `4 - Swift Extensions` for broadly reusable extensions of Swift standard
library or Foundation types. A filename containing `+`, or a file written in
Swift, does not by itself make the file a general Swift extension. Name a
general extension after the type and capability it adds, such as
`Date+StartOfWeek.swift`.

Place feature-specific extensions, model conversions and transport mappings
with the Feature, View or adapter that owns their meaning. First question an
extension to `AppModel`: prefer removing it by putting behaviour in the
appropriate Feature. If an extension remains justified, place it with the
owning Feature or View; put genuinely app-wide extensions beside `AppModel`.

Keep SwiftUI-specific extensions in `1 - View/SwiftUI Extensions`. Extensions
of UIKit types belong in the View layer, alongside their owner or in a shared
`UIKit Extensions` folder. Group protocols with the responsibility they support;
for example, storage contracts may live in `User Data Storage/Protocols` as shown
above. Do not create an app-wide catch-all `Protocols` folder for unrelated
responsibilities. A shared `UIKit Helpers` folder is appropriate for non-extension helpers used by
many views without a more specific owner. Cohesive private support declarations
may remain with the extension they support.

A broadly reusable `String` extension belongs in `4 - Swift Extensions`.
Shared generated or system strings that are not extensions belong with their
purpose, for example `Shared System Strings` in the View layer for localized
presentation text. App-wide system constants may live beside `AppModel` in a
purpose-named folder. Do not create a constants container speculatively when
starting an app. When an app-wide value is genuinely shared or repeated, such as
a company website or support address, define it once in a purpose-named enum
using static properties, and reuse it to prevent inconsistent copies or typos.
Consolidate values when their callers share the same meaning and should change
together. Keep independently owned values separate even when their literals
currently match. Keep Feature-specific constants with their owning Feature rather than placing
everything in one generic container. Read an app name or version from the
appropriate bundle metadata when that is the source of truth, and keep
localizable display text in localization resources. Do not hard-code secrets.
Keep generation paths and related lookup code together.
Platform protocols follow the same behaviour-first ownership rule; they do not
belong in an app-wide catch-all protocols folder. Never use `4 - Swift Extensions` as a
general utilities folder.

During a structural cleanup, inspect each file's declarations and callers,
not only its filename. Move files without changing behaviour, preserve Xcode
target membership and resource lookup, update generation/build scripts that
reference their paths, and verify the affected build and tests. The same
ownership reasoning applies to existing UIKit and mixed-UI projects.

### Domain Type Ownership

Domain values live with the feature that defines their meaning. A `WeightEntry`
belongs to Weight Log even though a repository persists it. Storage-only
representations such as file documents, CloudKit field mappings and database
records stay inside their persistence implementation. Transport-only payloads
stay inside the provider or adapter that translates them into domain values.
Keep domain types with their Feature even when they conform to Codable or are
persisted.

