<p align="left">
  <a href="https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS">
    <img src="readme-images/CFA-Toolkit-AppIcon.png" width="320" alt="CFA AI Toolkit for iOS icon">
  </a>
</p>

# CFA AI Toolkit for iOS

**Build, modernise, test and maintain iOS apps with AI, SwiftUI and Swift
Concurrency.** This repository contains the CFA AI Toolkit for iOS: eight AI skills, a
native Xcode project template, an architecture inspector and practical
guidance for working on new and existing apps. It is published by
[3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/).

Cooperative Feature Architecture (CFA) is the method underneath the toolkit.
Created by iOS developers with 17 years of experience building, publishing
and maintaining iOS applications, it gives SwiftUI, ViewModels, Features,
repositories and Swift Concurrency clear responsibilities. You can
use the toolkit to build with CFA without first studying an architecture
manual: the structure is visible in Xcode and the skills explain it as you go.

Its structure is visible in Xcode from the first day. This illustrative map
shows where a CFA application's features live:

```text
Application
├── 1 - View
├── 2 - AppModel
│   ├── AppModel.swift
│   └── Features
│       ├── Habits
│       │   ├── HabitsFeature.swift
│       │   └── HabitsWorker.swift
│       ├── WeightLog
│       │   ├── WeightLogFeature.swift
│       │   └── WeightEntry.swift
│       ├── Progress
│       │   └── ProgressFeature.swift
│       ├── Purchases
│       │   └── PurchasesFeature.swift
│       ├── Settings
│       │   └── SettingsFeature.swift
│       └── Backup
│           └── BackupFeature.swift
├── 3 - App Resources
└── 4 - Swift Extensions
```

Each feature has one named folder. Its concrete `Feature` type, domain values
and supporting workers live together inside that folder instead of being spread
across unrelated areas of the Xcode project.

CFA is presented as a candidate for the lasting default architecture for
mainstream iOS development. The iOS industry needs more templates for scalable,
commercial Xcode projects, and this is one. CFA follows strict KISS principles,
provides guidance for AI-written code, has fewer moving parts, and gives a
developer a visible path from SwiftUI to each implemented feature and the shared
state it owns.

# CFA AI Toolkit for iOS — 8 AI Skills + Inspector

**CFA AI Toolkit for iOS is a free, open-source collection of eight AI skills and one
tool.** It teaches an AI coding tool how to create, change, tidy, test, migrate
and review an iOS project using the CFA architecture. The skills give the AI a
clear blueprint to follow, which makes AI-driven development more consistent
and produces a more professional Xcode project from the first feature onward.

The plugin is listed as **CFA AI Toolkit for iOS** (`ios-app-development-cfa`)
so its purpose is clear in an installed plugin list. The GitHub repository is
**[CFA AI Toolkit for iOS](https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS)**;
Cooperative Feature Architecture remains the name of the architecture.

<p align="left">
  <a href="https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS">
    <img src="readme-images/3DaysOfSwiftConcurrency-h512.png" width="320" alt="3DaysOfSwiftConcurrency.com logo">
  </a>
</p>
Created by [3DaysOfSwiftConcurrency.com](https://www.3daysofswiftconcurrency.com/)
and released under the [MIT licence](LICENSE).

## Install CFA AI Toolkit for iOS once

An AI skill is a small folder of instructions for an AI coding tool. Installing
the CFA AI Toolkit for iOS copies its eight skill folders into the place where your coding
tool looks for skills on your computer. When you later ask your AI to create an
iOS app, it can read the CFA architecture instructions and use CFA.

The installation does not change Xcode or your existing apps. It only makes the
CFA AI Toolkit for iOS instructions available to your AI coding tool.

## Install the Xcode project templates

The CFA AI Toolkit for iOS includes **CFA App**, **Habit Tracker** and **Day Streak** Xcode templates. Each creates a
new, runnable CFA app directly from **File → New → Project**. It does not
modify an existing Xcode project.

Download or clone CFA AI Toolkit for iOS, then double-click
`Install Xcode Template.command`. It does not require Node.js.

You can alternatively run the same installer from Terminal:

```sh
./Install\ Xcode\ Template.command
```

The installer prints the exact folder it created. If it does not print
**“CFA App is installed in Xcode”**, the installation did not finish—read
the message in the Terminal window before closing it.

Quit and reopen Xcode. Choose **File → New → Project → iOS → CFA App**, **Habit Tracker** or **Day Streak**.
Xcode asks for your product name and organisation identifier, then creates a
new project with the CFA folders, feature, network refresh, JSON file
cache, retry state and colour-theme settings already in place.

**Habit Tracker** provides Today, Habits, Day Streak and Settings tabs, completion/count habits,
daily streaks, lazy SwiftData storage, colour themes and focused unit tests.
Its editable, ready-to-open project is in
[`templates/Xcode/Habit Tracker iOS`](templates/Xcode/Habit%20Tracker%20iOS/README.md).
The native template is generated from that project so its code stays in sync.

**Day Streak** is a daily-activity blueprint demonstrated by **Todays Twenty**: a
multiplication game with a cloud of answer buttons, 20 correct first attempts per
session, one optional extra practice and a reusable DayStreakFeature. It carries over
Trend's visual design, with seven colour palettes, saved progress and isolated tests.
Open the [Day Streak project](templates/Xcode/Day%20Streak%20iOS/README.md), or generate
a new project using its native template. The original Trend project is unchanged.

For a separate paid-feature example, open
[Habit Tracker Pro](templates/Xcode/Habit%20Tracker%20Pro%20iOS/README.md).
It adds a Trends tab with Swift Charts, a one-time StoreKit unlock and local
purchase tests. The free template remains unchanged; Pro is currently a
ready-to-open project, not an additional installer template.

Running the installer again updates CFA-installed templates and preserves backup copies.
It refuses to replace a same-named template from another source.

### Codex

Download and extract the CFA AI Toolkit for iOS plugin release, then double-click
`Install.command`. It finds a normal Node installation when one exists and can
also use Codex's installed runtime. In Terminal, the equivalent command is:

```sh
node scripts/install.mjs
```

When opened again, `Install.command` automatically requests a protected update
of its existing CFA installation. It still refuses to replace edited or
unrelated files.

This installs CFA AI Toolkit for iOS into your personal Codex marketplace. Open a **new** Codex
conversation and paste this message:

```text
I have installed CFA AI Toolkit for iOS from
https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS.
Do you have access to create and maintain iOS projects with CFA?
```

Codex should confirm that it can see the CFA AI Toolkit for iOS skills. From that point,
ordinary requests such as “Create a new iOS app…” can use the CFA architecture
without you having to paste its rules into every prompt.

### Claude Code and other AI coding tools

The portable CFA AI Toolkit for iOS skills are in the repository’s `skills` folder. Copy
all eight folders inside it, without renaming them, into the folder where your
AI coding tool reads skills.

For Claude Code, that folder is commonly `~/.claude/skills`. This command copies
the skills there for you:

```sh
node scripts/install.mjs --mode skills --skills-directory ~/.claude/skills
```

If your tool uses a different skills folder, replace `~/.claude/skills` with
that folder. Restart the AI tool or start a new conversation, then send it the
same confirmation message shown above.

The dashboard needs Node.js 20 or newer. `Install.command` can use Codex's
installed runtime when it is available. If your tool supports plain skill folders, you can copy the eight folders manually
instead of using Node.js.

For screenshots, upgrades and troubleshooting, read
[Installation](docs/INSTALLATION.md).

## New products and established apps

CFA App Creation supports the whole new-product journey, not just generating
the first files. A project can remain in **new-product development** while you
shape its screens and features. Its recorded workflow does not change merely
because the project now exists.

For **established-product maintenance**, CFA preserves your designer's choices.
Feature work, architecture adoption, migration and tidy-up do not add or
repeatedly offer themes, footers, branding or replacement icons. These are
[new-app design defaults](architecture/new-app-design-defaults.md), not
architecture compliance requirements. Explicit UI requests remain welcome.

Record the workflow once in your project's instructions. Even in new-product
development, a narrowly requested fix stays narrow; later user choices override
starter defaults. Read the [workflow policy](architecture/project-workflow.md).

## Try these CFA prompts

1. `Using CFA, create a new iOS app that finds where I parked my car.`
2. `Using CFA, migrate this legacy GCD codebase to Swift Concurrency.`
3. `Using CFA, add a new feature to the tab bar but keep it locked under an IAP.`
4. `Using CFA, now that we added a new feature, tidy up the code.`
5. `Using CFA, remove the new feature and all IAP code too.`
6. `Using CFA, make sure each exposed feature is unit tested, for all features.`
7. `Using CFA, analyse our use of Swift Concurrency: do we have race conditions that could result in unexpected behaviour?`
8. `Using CFA, add colour themes to the application.`

Saying **“Using CFA”** makes your intention clear. Once your AI tool reliably
finds installed skills, a normal iOS request can use CFA too. If it does not,
say “Using CFA” or name the relevant skill from the list below.

## CFA AI Toolkit for iOS skills

The CFA AI Toolkit for iOS contains eight AI skills and one local analysis tool.

| Skill | Use it when you want to… |
| --- | --- |
| [CFA App Creation](skills/cfa-app-creation/SKILL.md) | create and continue shaping a new iOS product with CFA. |
| [CFA Feature Work](skills/cfa-feature-work/SKILL.md) | add, change or remove a feature in a CFA app. |
| [CFA Architecture Adoption](skills/cfa-architecture-adoption/SKILL.md) | move an existing modern app into CFA one feature at a time. |
| [Legacy GCD migration](skills/swift-concurrency-migration/SKILL.md) | replace GCD, operation queues and callbacks with CFA and Swift Concurrency. |
| [CFA Architecture Review](skills/cfa-architecture-review/SKILL.md) | inspect architecture and concurrency without changing the app. |
| [CFA Codebase Tidy](skills/cfa-codebase-tidy/SKILL.md) | simplify a CFA project after feature work. |
| [CFA Unit Tests](skills/cfa-unit-tests/SKILL.md) | write and audit tests that protect real feature behaviour. |
| [Swift Code Quality](skills/swift-code-quality/SKILL.md) | apply Matt’s Swift standards to production code, examples and open-source projects. |

The included **Xcode Project Dashboard** scans a Swift Concurrency project and
creates a local HTML report. It exposes task creation, task ownership, source
locations, architecture observations and imported test results.

## Start with a complete CFA app

The installable **CFA App** Xcode template is a deliberately small, complete
project for learning the structure before building a product. It has a tab bar,
a launch refresh, a real public-network request, a JSON file cache, retry and
failure states, persistent colour themes and focused tests.

### Start shared work early, and screen work early too

CFA makes a deliberate distinction between two valid refresh paths. The app
delegate starts an app-wide system refresh at the earliest launch callback, so
shared work can run while the UI is prepared. Each screen uses SwiftUI
`.task` for its own initial asynchronous work; SwiftUI starts that work before
the View appears. Neither path blocks the first frame or promises that a remote
request has already finished. The owning Feature coordinates duplicate requests
and publishes observed loading, cached, empty, success or error state.

This avoids a common false choice: using a View task as the whole app's launch
mechanism, or postponing all loading until a screen is visibly on screen. CFA
uses both routes, each with a clear owner.

## The CFA architecture

CFA gives every type of code a clear home:

- **View:** says what the screen looks like.
- **ViewModel:** holds the screen state and prepares it for the View.
- **Feature:** owns the feature’s business rules and feature state.
- **Repository:** reads and writes data, such as a local file, database or web service.
- **AppModel:** creates the real features and repositories in one place.

The path through one feature is:

```text
View → dedicated ViewModel → Feature API → Feature → Repository
```

Here is an illustrative CFA folder map. Every feature has its own View,
ViewModel and feature code, so a
developer can follow one feature without searching through unrelated files.

```text
Application
├── 1 - View
│   ├── App.swift
│   ├── Theme
│   │   ├── AppColourTheme.swift
│   │   └── ThemeManager.swift
│   └── Views
│       └── Git Repos
│           ├── GitReposView.swift
│           └── GitReposViewModel.swift
├── 2 - AppModel
│   ├── AppModel.swift
│   ├── Features
│   │   ├── Habits
│   │   │   ├── HabitsFeature.swift
│   │   │   └── HabitsWorker.swift
│   │   ├── WeightLog
│   │   │   ├── WeightLogFeature.swift
│   │   │   └── WeightEntry.swift
│   │   └── Progress
│   │       └── ProgressFeature.swift
│   └── Networking & Data Storage
│       ├── Protocols
│       │   └── WeightRepository.swift
│       └── Local
│           └── LocalDataStore.swift
├── 3 - App Resources
│   └── PrivacyInfo.xcprivacy
├── 4 - Swift Extensions
│   └── Date+Day.swift
├── Assets.xcassets
└── ApplicationTests
    ├── ViewModelTests
    │   └── GitReposViewModelTests.swift
    └── FeatureTests
        └── WeightLogFeatureTests.swift
```

`AppModel.shared` is the app’s composition root. It builds the real objects the
app needs and passes them to each feature. A concrete Feature owns feature rules;
a ViewModel owns only screen presentation state; a View stays quick to create
and simply reflects its ViewModel.

Read the full [CFA specification](architecture/cfa-specification.md) and
[Swift coding guide](architecture/swift-coding-guide.md) for the complete rules.

## What CFA AI Toolkit for iOS helps your AI do

- Create a commercially structured SwiftUI project instead of a pile of files.
- Keep business decisions out of SwiftUI Views.
- Give every screen its own ViewModel.
- Keep each feature’s state and rules with the Feature that owns it.
- Use Swift Concurrency with clear ownership, cancellation and ordering.
- Preserve the product’s behaviour while migrating a legacy app.
- Write meaningful tests for feature behaviour, failures and repeated requests.
- Review source code and show the evidence in a local dashboard.

## Legacy GCD migration means more than changing syntax

This is not a search-and-replace from `DispatchQueue.async` to `Task { }`.
GCD often protects important behaviour: save order, shared state, cancellation,
error delivery and the rule that an old request must not overwrite a new result.

The Legacy GCD migration skill first records that existing behaviour. It then
creates clear CFA feature boundaries and moves concurrency one feature at a
time. Builds, tests and manual regression testing check that the migrated app
still does what the original app did.

## CFA Inspector

The installer provides one shared, read-only inspector; it is not copied into
each app. Run `cfa inspect` from a project folder, or pass a project path:

```sh
cfa inspect /path/to/your-xcode-project
cfa inspect /path/to/your-xcode-project --json
```

It maps each screen to its adjacent ViewModel, visible `AppModel.shared`
feature route, and named tests. It flags missing links for review without
changing the project. This is a lexical source check, not a compiler, test run,
or automatic CFA certification. The CFA Architecture Review skill uses its
output as a starting map and checks important decisions in the actual code.
Existing app code is not renamed automatically; `cfa doctor` warns if an
earlier installed project-guidance block still requires the old Manager suffix.

## Xcode Project Dashboard

The easiest way to create a dashboard is to ask your AI coding tool:

```text
Using CFA, analyse my Xcode project and produce a dashboard.
```

The CFA Architecture Review skill tells the AI how to inspect the project, run
the dashboard and explain the report. The dashboard runs locally and does not
edit your application.

If you prefer Terminal, the CFA installer adds a short command:

```sh
cd /path/to/your-xcode-project
cfa dashboard
```

It scans the current folder and creates a new timestamped dashboard folder
inside it. To analyse another project, give its folder path:

```sh
cfa dashboard /path/to/your-xcode-project
```

### Keep CFA visible in one project

Installed skill descriptions make CFA available for ordinary iOS requests
across your computer. For an existing CFA project, you can also add a small,
host-aware project instruction file once:

```sh
cd /path/to/your-cfa-project
cfa enable-project
```

The command appends marked guidance to an existing `AGENTS.md` without
overwriting it. For Claude Code, choose its instruction filename explicitly:

```sh
cfa enable-project --host claude
```

This is optional. It reinforces CFA in that repository; it does not install
skills or alter source code. Check the current installation and project guidance
at any time with:

```sh
cfa doctor
```

The installer places `cfa` in `~/.local/bin`. If Terminal says `command not
found: cfa`, add that folder to your zsh path once, then open a new Terminal:

```sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
```

The dashboard can show where Tasks are created, whether a root Task is tracked,
possible suspension points, architecture observations and imported test results.
It links findings back to the source code so you can inspect the evidence.

It cannot prove that an app has no race conditions. An AI reviewer must inspect
the relevant source, and the app still needs builds, tests and manual checks.

## Apps made with CFA

These open-source iOS projects show CFA in use:

- [Cuentiva](https://github.com/3DaysOfSwift/Cuentiva)
- [Personal API iOS App](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA)
- [Trend iOS App](https://github.com/3DaysOfSwift/Trend-iOS-App-Swift-Concurrency-CFA)
- [RocketLaunch iOS App](https://github.com/3DaysOfSwift/RocketLaunch-iOS-App-Swift-Concurrency)
- [Metro Mate iOS](https://github.com/3DaysOfSwift/metro-mate-ios), an open-source app migrated with CFA and Swift Concurrency.

See [Apps Made with CFA](docs/APPS-MADE-WITH-CFA.md) to learn what each project
demonstrates.

## Migration evidence (opt-in)

The migration skill can now capture a case study when requested: the starting
behaviour, decisions, alternatives, human corrections and actual verification.
Working records stay outside the customer's app repository. The local template
and validator distinguish drafts from reviewed cases, general Swift Concurrency
guidance from CFA choices, and real work from synthetic examples.

This is capture infrastructure, not a trained model or an approved-case retrieval
service. No real migration cases are included yet. See the
[capture and review workflow](architecture/migration-evidence.md) and the
[local tooling guide](skills/swift-concurrency-migration/scripts/evidence/README.md).

## Build CFA AI Toolkit for iOS from source

If you are contributing to the toolkit itself, run these commands from a source
checkout:

```sh
npm run sync
npm run validate
npm test
python3 scripts/release.py
```

Building a release needs Python 3 and Node.js 20 or newer. There are no npm
packages to install.

Read [Contributing](CONTRIBUTING.md), the [release process](docs/PUBLISHING.md),
the [validation record](docs/VALIDATION.md) and [Privacy](docs/PRIVACY.md).

## Further reading

Start with the [installation and first-use guide](docs/INSTALLATION.md), then use
the [CFA architecture specification](architecture/cfa-specification.md) to
understand the structure the AI skills create and maintain. These articles from
3 Days of Swift Concurrency explain the ideas behind that workflow:

- [Can I Delay Learning Swift Concurrency?](https://www.3daysofswiftconcurrency.com/blog/can-i-delay-learning-swift-concurrency%3F) — a practical case for modernising existing iOS apps incrementally.
- [What Does async Mean in Swift?](https://www.3daysofswiftconcurrency.com/articles/what-does-async-mean-in-swift) — why asynchronous work changes application architecture.
- [What Is a Logical Race in Swift Concurrency?](https://www.3daysofswiftconcurrency.com/blog/what-is-a-logical-race-in-swift-concurrency) — why feature ownership and request ordering still matter when code is data-race safe.

## Copyright and permission

<p align="left">
  <a href="https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS">
    <img src="readme-images/3DaysOfSwiftConcurrency-h512.png" width="320" alt="3DaysOfSwiftConcurrency.com logo">
  </a>
</p>
Copyright © 2026 [3 Days of Swift Concurrency](https://www.3daysofswiftconcurrency.com/).

You may use, copy, change and share the CFA architecture and CFA AI Toolkit for iOS,
including in commercial work, under the [MIT licence](LICENSE).
