# CFA skill evaluations

These small fixtures preserve behaviour that the Toolkit must maintain as its
skills evolve. They are not application templates and are not copied into a
developer's Xcode project.

Run `npm run evals` to check required markers in the flat-app, migration
handoff, product-design and explanation fixtures. This structural check
verifies the fixture files. Run the cases in an installed host to verify
responses.

Before a CFA release, run each applicable fixture in a fresh conversation with
the candidate toolkit installed. Give the host the ordinary-language request
and the fixture inputs. Keep the expected outcome and failure criteria for the
reviewer. Record the toolkit revision, host and model, observed skill selection,
and the outcome against the criteria. Mark a case unverified if the host could
not run it or its skill selection could not be established. Record misrouting
as a focused correction to the responsible skill.

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
