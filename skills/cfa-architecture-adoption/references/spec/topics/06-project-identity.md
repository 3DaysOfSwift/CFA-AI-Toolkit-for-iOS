## Project Identity

For a new application, use the developer’s organisation prefix and a bundle-safe
app name. Ask for the prefix if it is not supplied; for disposable examples use
`com.example.<AppName>`. Test targets append their target name. Never change an
existing bundle identifier without an explicit request. When adapting an
existing project, compare the resolved bundle identifiers of the affected
existing app and test targets before and after project structure or build
settings changes. Record both values for each affected build configuration
and record the developer’s authorisation for any change.

The original 3 Days of Swift Concurrency projects use
`com.3DaysOfSwiftConcurrency.<AppName>` as their organisation convention. It is
not a requirement of CFA or a default for other developers.

Before handing over every newly created Xcode project, build for a generic iOS
device and inspect the *built* app's `Info.plist`. It must contain concrete,
non-empty values for `CFBundleIdentifier`, `CFBundleDisplayName`,
`CFBundleShortVersionString` (marketing version), and `CFBundleVersion` (build
number). Do not treat an Xcode build-setting expression or a template token as
filled-in metadata. This check applies to each app target; test targets use
their own bundle identifiers but do not need a user-facing display name.

### Test Target Defaults

Create a unit-test target for each new app, but do not create a UI-test target
or an empty `AppNameUITests` folder. CFA's new-project tests cover Feature and
ViewModel behaviour in the unit-test target; an unused UI-test target adds
navigator noise and build work without evidence. Add UI tests only when the
developer explicitly requests a defined UI automation scenario.

