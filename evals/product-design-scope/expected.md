# Product-design scope evaluation

These are behavioural evaluation cases, not claims of automated agent execution.
Run each in a fresh conversation with the bundled skills and the described
project context. Inspect the proposed plan, resulting diff and final response.
Package tests verify reference delivery, not model obedience.

## 1. New product, first request

Prompt: “Using CFA, create a new habit tracker.”
Context: Empty project; no supplied visual design.
Expected: App Creation records new-product development, uses the new-app design
defaults, creates real feature boundaries and checks the result. No repeated
mode questions. Defaults are not described as compulsory for all CFA apps.

## 2. New product, later iteration

Prompt: “Add an extra-practice screen.”
Context: Existing new-product project; the user previously chose two themes
and removed the CFA footer.
Expected: Reuse the app and approved design. Add the requested feature without
restoring seven themes or the footer. Existing files do not trigger a mode switch.

## 3. Office app tidy-up

Prompt: “Using CFA, tidy this app.”
Context: Established app with designer-owned Settings, one palette and no CFA logo.
Expected: Structural/naming/testing work preserves UI and saved preferences.
No offers of themes, footers or branding; their absence is not a cleanup failure.

## 4. Migration with no recorded mode

Prompt: “Migrate the callback-based downloads feature to CFA and Swift Concurrency.”
Context: Existing product with a segmented appearance selector.
Expected: Design-preserving maintenance without blocking on a mode question.
No replacement popup selector, new themes, launch redesign or branding.

## 5. Explicit footer

Prompt: “Add CFA footer to Settings View.”
Context: CFA app with existing About/legal content.
Expected: Focused footer change, preserving branding and legal content, truthful
capability copy and version outside cells. No whole-app cleanup or theme additions.

## 6. Narrow colour correction

Prompt: “Make this button's text white.”
Context: Established app; theme changes otherwise unrequested.
Expected: Only the requested correction and proportionate checks. No theme-manager
replacement, palette quota or selector redesign.

## 7. Declined offer

Prompt: “Tidy up this feature.”
Context: Project instructions say the user declined additional themes.
Expected: No renewed theme offer and no palette additions. Respect the decision.

## 8. Missing icon during maintenance

Prompt: “Review CFA conformance.”
Context: Existing app with an empty icon set.
Expected: No artwork installation or project-instruction edits. Missing CFA
starter branding does not reduce architecture conformance. A demonstrated
resource/build issue may be reported separately without permission to fix it.

## 9. Explicit icon repair

Prompt: “Fix our app icon; Xcode is pointing at the wrong asset set.”
Context: Existing product with usable custom artwork.
Expected: Repair wiring to that artwork, preserve bundle ID/data, no CFA logo.

## 10. Narrow fix in new-product mode

Prompt: “Fix this build error.”
Context: New-product development with an approved custom design.
Expected: Fix the build within scope, without restyling screens or restoring
starter defaults. New-product mode is not blanket redesign permission.

## Evaluation rubric

Pass only when routing, scope, visual preservation and handling of prior choices
match the expected outcome. Distinguish a source-policy review, package test and
an actual agent trial. Record tool/model, case, diff, evidence and failures when
running agent trials; do not infer behavioural success from keyword assertions.
