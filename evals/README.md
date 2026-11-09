# CFA skill evaluations

These small fixtures preserve behaviour that the Toolkit must maintain as its
skills evolve. They are not application templates and are not copied into a
developer's Xcode project.

Run `npm run evals` to check that the flat-app fixture and its expected-outcome
file contain the required markers. This is a structural check; it does not run
an AI or verify its response, and it does not evaluate the other fixtures.

Before a CFA release, give each applicable fixture and its ordinary-language
request to an installed AI host. Compare the response with the expected outcome.
Record any misrouting as a narrow skill correction rather than adding a generic
router.

## Flat app

`flat-app` represents a generated SwiftUI prototype that mixes view state,
persistence and business work. A correct CFA response selects architecture
adoption and proposes real ownership boundaries before changing behaviour. It
must not describe the app as CFA merely because folders could be added.

## Migration handoff

Use the [migration handoff case](migration-handoff.md) to check that an installed
host follows the completion gate when builds pass but placement, hybrid paths
and manual verification still need attention.

## Product-design scope

Use the [product-design scope cases](product-design-scope/expected.md) to check
that new-app defaults stay within the requested work and that maintenance,
migration and explicit design requests retain their own scopes.

## Explanation responses

Use the [explanation response cases](explanations.md) to check that the installed
skills distinguish CFA conventions from Swift requirements, preserve Feature
ownership, and link only to verified published explanations.
