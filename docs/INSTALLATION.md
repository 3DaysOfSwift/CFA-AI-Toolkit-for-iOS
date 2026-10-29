# Install CFA AI Toolkit for iOS

## Requirements

- Node.js 20 or newer (`node --version`) for Terminal installation and the dashboard. No npm package installation is needed. On macOS, `Install.command` can also use Codex's installed runtime when it is available.
- For the Codex plugin: a Codex CLI supporting `codex plugin add` and personal marketplaces.
- For iPhone builds: a Mac, Xcode and an available Simulator/device.
- For AI-guided workflows: your own supported agent/account and its normal permissions.

Node.js, Xcode and the AI host are not bundled. The package contains the architecture,
all eight skills, references and dashboard executable source, with no Trend dependency.

## Xcode project templates

The CFA AI Toolkit for iOS includes **CFA App**, **Habit Tracker** and **Day Streak**, native Xcode project templates. Their installation is
separate from the AI-skill installation: install it when you want a new CFA
project to appear in Xcode's project chooser.

From the root of the extracted CFA AI Toolkit for iOS release, double-click
`Install Xcode Template.command`. It copies all three templates without requiring
Node.js.

You can instead run it from Terminal:

```sh
./Install\ Xcode\ Template.command
```

Wait for the installer to say **“CFA App is installed in Xcode”** and show
the installed folder. If it does not, the template has not been installed;
read the Terminal message before closing that window.

Then quit and reopen Xcode. Choose **File → New → Project → iOS → CFA App**
or **Habit Tracker** or **Day Streak**. Habit Tracker includes habit tracking,
SwiftData, Settings and tests. Day Streak includes daily multiplication practice.
Xcode will ask for the product name and organisation identifier and generate a
new project. The template installer copies only into your personal Xcode
Templates folder; it never changes an existing app.

Run the installer again to update previous CFA copies, preserving backups. It replaces only a
template containing CFA's own marker and refuses to change a same-named
template from another source.

## Starter Apps

For working apps to get you going fast, browse [Starter Apps](../starter-apps/README.md).
Open one of these projects directly without installing a template:

- `starter-apps/Habit Tracker/HabitTrackerTemplate.xcodeproj`
- `starter-apps/Habit Tracker Pro/HabitTrackerPro.xcodeproj`
- `starter-apps/Todays Twenty/TimesThirty.xcodeproj`

Habit Tracker and Todays Twenty are the editable sources of the Habit Tracker
and Day Streak native templates. Habit Tracker Pro is a standalone charts and
purchases example. See each app's README for setup and verification; these are
starting points, not preconfigured App Store products.

## Recommended: Codex plugin

1. Download the `ios-app-development-cfa-<version>-plugin.zip` release.
2. Extract it. Keep the extracted folder intact.
3. Open a terminal in that folder and run:

```sh
node scripts/install.mjs
```

On macOS you can instead open `Install.command`; Terminal will run the same installer and can find Codex's installed runtime when a system Node installation is unavailable.
When a CFA installation already exists, that command automatically requests a
protected replacement. It still refuses an edited or unrelated installation.
If macOS asks you to approve opening a downloaded script, inspect the script and use
the terminal command above. The package is not an Apple-signed or notarised installer.

The installer verifies the package checksum inventory, copies the complete plugin to
`~/plugins/ios-app-development-cfa`, preserves/extends your personal
`~/.agents/plugins/marketplace.json`, and runs `codex plugin add` using the actual
marketplace name. No custom marketplace registration is required for this default
personal location. It also adds a `cfa` Terminal command in `~/.local/bin`. No
source app is changed and no software is downloaded.

After installation, you can generate a dashboard for the Xcode project in your
current Terminal folder with:

```sh
cfa dashboard
```

For a faster, read-only map of CFA screen ownership and missing routes or
tests, run `cfa inspect` in the project folder (or pass its path). Add `--json`
for machine-readable output. The inspector does not edit the app, run tests,
or certify architectural correctness.

The same command can confirm the installed CFA skills and optional project
guidance:

```sh
cfa doctor
```

To reinforce CFA automatically whenever an AI host works inside one existing
CFA project, append safe, marked guidance to that project’s instruction file:

```sh
cfa enable-project /path/to/your-cfa-project
```

This does not modify Swift source. It preserves any existing `AGENTS.md` text
and appends CFA guidance once. For Claude Code, use `--host claude` to write or
append `CLAUDE.md` instead. Project guidance is optional: installed skill
descriptions remain the mechanism that matches ordinary iOS prompts across the
computer.

If `cfa` is not found, add its folder to zsh's path once and open a new Terminal:

```sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
```

If `codex` is not on PATH, pass its executable explicitly:

```sh
node scripts/install.mjs --codex /path/to/codex
```

The installed plugin should appear as **CFA AI Toolkit for iOS**. If Codex still
shows **Cooperative Feature Architecture**, that is the older
`cooperative-feature-architecture` plugin, not this release. Install this
release and remove the older plugin separately once you have confirmed the new
one works; changing the source repository alone does not rename an existing
installation.

Open a **new conversation** after installation and ask the agent:

```text
I have just installed CFA AI Toolkit for iOS from
https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS.
Did it work? Do you have access to create and maintain iOS projects with CFA?
```

Then use ordinary prompts such as “Create a new iOS app…”; CFA App Creation is
described to activate for new iOS-project requests unless the developer asks for
a different architecture.

If native Codex activation fails, the installer exits unsuccessfully and explains
how to retry. The source and marketplace entry stay staged; it does not claim that
Codex has loaded them. The plugin validator checks package structure but cannot prove
compatibility with every host version.

## Claude Code and other portable skill hosts

```sh
node scripts/install.mjs --mode skills --skills-directory ~/.claude/skills
```

This installs all eight folders into Claude Code's skill directory. Each is
self-contained: the CFA specification and supporting references are bundled as
needed, and the dashboard source and docs are inside the review skill. Restart
Claude Code or open a new conversation after installation.

For another compatible host, use its documented skill directory instead:

```sh
node scripts/install.mjs --mode skills --skills-directory /path/to/that-host/skills
```

The portable `plugin.json` and `skills/` layout is included for hosts that
support Agent Plugins. This is a filesystem installation, not a claim that every
AI product discovers local skills or supports the dashboard runtime.

## Upgrades

Run the installer from the new extracted release with `--replace` (and the same mode).
Only CFA-managed, unmodified installations can be replaced. The previous directories
are retained as `.backup-<identifier>` beside the installation. Edited or unrelated
folders are not overwritten; move them aside deliberately before retrying.

The installer preserves the existing marketplace name, metadata, other plugins and
an existing CFA policy entry. It refuses a CFA entry pointing to a different source.

### Upgrading from the original two-skill release

Plugin mode replaces the whole managed package with `--replace`, so the old skill
names disappear from the active package. Open a new conversation afterward.

For standalone mode, the installer refuses to proceed if `cfa-development` or
`xcode-project-dashboard` remains under `.agents/skills`. Move these legacy folders
outside the host’s skill discovery directory first, retaining any edits, then install
the eight new skills. This prevents duplicate or conflicting guidance. The installer
never silently deletes an old skill or guesses whether local edits are disposable.

## Uninstall

For a plugin, use `codex plugin remove ios-app-development-cfa@personal`,
substituting the marketplace name printed by the installer if it was not `personal`.
This removes native activation; the staged source and marketplace listing can remain
for reinstall. Remove those deliberately only when you no longer need them.
Existing installations under `cooperative-feature-architecture` are a separate
plugin identity. Installing this renamed plugin does not remove the old one;
review any local changes before deactivating the previous installation.

For standalone skills, remove only the eight installed folders printed by the installer:
`cfa-app-creation`, `cfa-feature-work`, `cfa-architecture-adoption`,
`swift-concurrency-migration`, `cfa-architecture-review`, `cfa-codebase-tidy`,
`cfa-unit-tests` and `swift-code-quality`. Keep any local edits first.

## Offline staging and checksums

```sh
node scripts/install.mjs --destination /path/to/temporary-profile --stage-only
```

This prepares a plugin and personal marketplace without calling Codex. It is useful
for testing and is labelled **staged**, not installed.

`SHA256SUMS` lets users compare downloaded archive digests. `checksums.json` protects
the extracted package against accidental modification. These are integrity checks,
not publisher signatures; obtain the release from the intended repository.
