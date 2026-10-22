# New-app design defaults

Read [project workflow and design authority](project-workflow.md) first.
These defaults give a new app a polished starting point. They are not CFA
architecture requirements for established products, and explicit designs or
later user choices override them. Do not reapply them on every iteration.
Apply an individual section to an existing app only on an explicit request
for that change; do not repeatedly propose the remaining sections.

### Settings About Section and CFA Footer

For **newly generated apps**, include a branded About section at the bottom of
Settings by default. Reuse the app's existing wordmark or logo when supplied;
otherwise display its actual app name with clear typographic emphasis. Do not
copy another app's branding. Include an Architecture row labelled
**CFA iOS Architecture** and the supporting sentence
**Built with Cooperative Feature Architecture.** This identifies the engineering
approach, not an independent certification or a guarantee of bug-free software.

Describe only capabilities verified in the generated app. Mention SwiftData
when it is used, distinguish local storage from synchronisation or remote
services, and describe AI as on-device only when its inference actually runs
there. Omit the AI row when there is no AI. Never infer a privacy promise from
the choice of database; account for cloud sync, analytics and external services.

Below the About card, outside all cells, use a table/section footer containing
a short app-specific description and a separate centred
`Version <marketing version> (<build number>)` line. Read the actual bundle
metadata; never hard-code a release number or invent one when missing.
Use an honest placeholder for unavailable metadata. Keep text readable across
themes and Dynamic Type, allow long names/values to wrap, and keep the footer
clear of the tab bar. The existing Settings ViewModel owns presentation
formatting; this does not justify another Feature or a database request.

For **existing apps**, this is opt-in, not an adoption or tidy-up requirement.
The explicit request **“add CFA footer to Settings View”** (or equivalent
consent) enables this focused change. Do not repeatedly ask, add it during
ordinary cleanup, or treat its absence as a failure. Preserve existing branding,
legal/privacy information and About content; merge rather than duplicate when
the user requests it. A focused footer request does not authorize unrelated
tidy-up passes. Check that the app uses CFA before describing it as CFA.

**Review:** Verify metadata formatting and missing-value handling, truthful
technology descriptions, branding, footer placement, large text and contrasting
themes. Record unavailable visual checks separately from source/build checks.

### Mandatory Initial App Icon

Every new iOS app project must have a working initial app icon before delivery,
so its Simulator installation does not display an empty icon. Use supplied
product artwork when available; otherwise use the existing CFA App template's
`CFA-App-Icon.png` and its `AppIcon.appiconset/Contents.json`. Reuse that artwork,
not the toolkit's plugin logo and not a newly generated substitute.

For a new app, inspect each iOS app target's icon. An empty icon set, a missing
image or an unconfigured target is not a working icon. Preserve custom artwork,
alternate icons and appearance variants; repair wiring before replacing assets.
In an established app, add starter artwork only when explicitly requested.
Ordinary adoption, migration or tidy-up does not authorize new branding.

Set `ASSETCATALOG_COMPILER_APPICON_NAME` to the actual icon set name for the app
target's build configurations. Verify catalog target membership, referenced
image files and dimensions, then build and check the installed app icon on the
Simulator Home Screen when available. Do not erase app data to refresh an icon.
Report any unverified Simulator check; file presence alone is not visual proof.
Missing optional dark/tinted variants do not make a valid base icon missing.
Do not change bundle identifiers, unrelated targets or existing branding.

The canonical starter asset lives in the CFA App Xcode template's
`Source/Assets.xcassets/AppIcon.appiconset`. The creation, adoption, migration
and tidy skills bundle the same asset at `assets/AppIcon.appiconset` so this
asset remains available for explicit requests without a toolkit checkout.
Its presence in a maintenance skill is not permission to install it.
A read-only review never changes icons.

### Colour Theme

Create a dedicated `ThemeManager.swift` alongside `AppColourTheme.swift` in
`1 - View/Theme`. The application owns exactly one observable ThemeManager and
supplies that same instance to every screen, scene, and presentation. Do not
construct separate managers in individual screens or place this presentation
state in AppModel.

Unless the user supplies another design, a new CFA app ships seven distinct,
complete colour palettes, including at
least one light and one dark palette, plus an **Automatic** selection. Automatic
is a mode, not an eighth palette: it follows the system appearance using one
named default light palette and one named default dark palette. It is the
default for a fresh installation or an unknown saved identifier. A manual
choice stays selected when system appearance changes; returning to Automatic
follows the system again. Persist the mode, not its last resolved palette.

ThemeManager owns the current selection and exposes its palette. Every screen and shared component
uses that current palette for semantic colours: backgrounds, surfaces, text,
secondary text, accents, button foregrounds, and feedback. Keep palette literals
centralized. Deliberately fixed artwork colours can remain stable, but must not
be used as a substitute for themed interface colours.

Use `tint` for the interactive accent colour and `colorScheme: ColorScheme?`
for the light/dark appearance preference (`nil` for Automatic). Name the
contrasting foreground drawn over the tint `onTint`. Keep `theme` for the
complete palette, not just its appearance preference. The call sites read
`.tint(theme.tint)` and `.preferredColorScheme(theme.colorScheme)`, matching
SwiftUI terminology without renaming the framework modifiers.

Add a colour-theme selector to Settings using a native popup menu. A labelled
row shows the current choice and opens the choices when tapped. Use SwiftUI
`Picker` with explicit `.pickerStyle(.menu)`, or a native `Menu` containing a
selection-aware Picker. Show names and a selected-state checkmark; swatches
alone are insufficient. Never use a horizontal tab bar, segmented control, or
horizontally scrolling swatch strip to select themes. This restriction does
not prohibit the app's navigation `TabView`. Support VoiceOver, Dynamic Type
and comfortable touch targets. Selection applies immediately without Save.

Changing it must update visible and subsequently presented screens immediately.
Persist a stable theme identifier
across launches, with a default fallback for a missing or obsolete identifier.
Make system appearance, navigation, lists, text inputs, and sheets agree with
the selected palette; do not force light mode for a dark theme. Declare any
required privacy-manifest reason for the chosen preferences API.

In Automatic, leave the preferred colour scheme unset and respond to actual
system appearance changes while the app is open. Apply manual overrides to
native controls and sheets consistently; do not mistake a forced scheme for
the system preference.

Verify all seven palettes on the main user journey and in Settings, including
contrast, selection persistence, and newly opened sheets. Test Automatic in
both appearances, live system changes, manual overrides, returning to Automatic,
and missing/obsolete saved identifiers. Keep the themes and manager in
`1 - View`, because they own presentation rather than application behaviour.

Use these defaults when first creating a new app's theme system, or when the
user explicitly requests this design. Existing apps retain their theme count,
selector and saved choices unless the user asks to change them. A narrow colour
fix does not authorize seven palettes or a new selector. Do not report missing
defaults as architectural gaps.

### System Launch Appearance

Every new CFA app supplies a minimal system launch screen with a named
`LaunchBackground` asset containing light (Any Appearance) and dark variants.
Use the default light and dark palette backgrounds so Automatic transitions
naturally into the first screen. The system launch screen always follows the
device appearance, not the saved in-app theme. Do not force `UIUserInterfaceStyle`
to make it match a manual theme selection. Keep manual in-app themes available.

Configure the native launch screen in the app target; it is not a SwiftUI View
and cannot consult ThemeManager or saved preferences. Do not add a timed splash,
database gate, or loading overlay to prolong it. Keep launch resources in
`3 - App Resources` and colour variants in the app's existing asset catalog.
Verify the built launch resource and both appearances, including a saved app
theme that differs from the device. Keep palette changes and launch colours in
sync. Use this default in new templates; preserve established launch designs
unless the user requests a launch-appearance change.
