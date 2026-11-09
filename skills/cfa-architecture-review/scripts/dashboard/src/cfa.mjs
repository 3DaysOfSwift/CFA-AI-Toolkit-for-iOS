#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspect, renderInspection } from './inspector.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const dashboardCLI = path.join(scriptDirectory, 'cli.mjs');
const args = process.argv.slice(2);
const cfaSkillNames = [
  'cfa-app-creation',
  'cfa-feature-work',
  'cfa-architecture-adoption',
  'swift-concurrency-migration',
  'cfa-architecture-review',
  'cfa-codebase-tidy',
  'cfa-unit-tests',
  'swift-code-quality'
];
// Keep this legacy ownership marker stable so upgrades recognise existing guidance.
const guidanceMarker = '<!-- CFA Toolkit project guidance -->';
const outdatedStartupGuidance = 'or a scheduled Task. Features can start their own asynchronous work without';
const startupGuidanceUpdate = 'AppModel must signal Features and start required app-wide listeners before the launch callback returns.';
const outdatedAppModelGuidance = 'AppModel stores only shared, concrete Features, and one private launch guard.';
const outdatedFeatureGuidance = 'managers use the Manager suffix';
const outdatedDependencyFlow = 'Preserve the CFA call path: View → ViewModel → Feature → Microservices';
const dependencyFlowUpdate = 'A Feature calls internal microservices only when its work needs them.';
const outdatedServiceGuidance = 'SwiftData uses SwiftDataManager; URLSession calls use NetworkingManager.';
const serviceGuidanceUpdate = 'Clarify SwiftDataManager ownership and keep independent network requests able to progress in parallel.';
const outdatedScreenGuidance = 'Every screen owns a dedicated ViewModel. Declare it as @State private var';
const previousInlineScreenGuidance = /@State private var viewModel and construct it inline by default\. Keep View/;
const detailScreenGuidance = 'A detail View may receive selected immutable value data';
const screenGuidanceUpdate = 'Apply private @State ViewModel ownership to SwiftUI screens, allow detail Views to construct their own ViewModel from an immutable snapshot, and trace the actual presentation owner for UIKit migrations.';
const outdatedDeepLinkGuidance = 'remove it on actual navigation or explicit dismissal';
const outdatedPendingSaveGuidance = 'Persist only the safe data needed to identify and present each request.';
const outdatedDismissalGuidance = 'request can reappear after restart until removal is saved. The destination owns its content loading.';
const deepLinkGuidanceUpdate = 'Confirm pending requests only after persistence succeeds, and retry failed removal without navigating again. Keep a failed dismissal pending for retry.';
const outdatedSnapshotGuidance = 'Published domain snapshots use immutable properties and contents';
const snapshotGuidanceUpdate = 'Use let properties and check nested values for mutable references.';
const outdatedSharedWaitGuidance = 'A departing screen may stop waiting while the Feature keeps refreshing.';
const sharedWaitGuidanceUpdate = 'For a prompt exit, cancel the screen’s wait independently of the Feature’s shared refresh.';
const projectGuidance = `${guidanceMarker}
# CFA project guidance

This iOS project uses Cooperative Feature Architecture (CFA). The supporting
product is CFA AI Toolkit for iOS. Match each request to the relevant installed
skill from that toolkit before changing the project.

- Apply optional new-app visual defaults only when establishing a new design
  and the developer has not supplied one. Preserve the existing product design
  during migration and maintenance, and keep explicitly requested visual
  changes within scope. Missing optional themes, branding or a CFA footer
  do not count as architecture findings.
- Preserve the CFA call path from View to ViewModel to Feature. The Feature
  calls internal microservices when it needs networking, storage or device APIs.
- Every screen-level SwiftUI View owns a dedicated ViewModel. Declare it as
  @State private var viewModel and construct it inline by default. Keep View
  and ViewModel initializers and View body construction free of blocking work
  and asynchronous side effects. Use SwiftUI's .task for initial work tied to
  the screen's lifetime. The first frame may appear before that work completes.
  In .refreshable, await the refresh method or its returned task handle's
  value so the indicator stays active while the screen waits.
  For existing UIKit screens in a migration, map the actual presentation owner
  to its Features and tests.
- A concrete feature owner uses the
  Feature suffix; its AppModel property, ViewModel dependency and initializer
  label use the matching lower-camel-case Feature name. Use concrete features
  directly; do not add matching FeatureAPI protocols. Lower-level services keep names that
  describe their actual jobs.
- On supported deployment targets, use @Observable for ViewModels and
  Features whose state the UI observes. Preserve a compatible observation
  mechanism when a migration must support an older deployment target.
  For live data, read observable Feature state through the ViewModel so
  confirmed changes reach the View without a manually synchronized copy.
  Preserve the event API or its delivery contract when a consumer needs
  every event. Verify repeated values, ordering, cancellation and any required
  buffering separately from the latest state the UI displays.
- A detail View may receive selected immutable value data and construct its own
  State-backed ViewModel in its initializer. Do not inject or share ViewModels;
  keep each scene's selection in presentation, not in a shared Feature. The
  supplied snapshot seeds the destination identity. A changed input does not
  automatically replace its State-backed ViewModel.
  Keep the selected snapshot and navigation stable when the source list changes.
  Omission from a refreshed list does not establish deletion. Prefer explicit
  refresh where it meets the product need. If several consumers need live
  updates for one item, prefer a focused Feature API by item identity and
  define its lifetime and missing-item behaviour. Verify that refreshing the
  source list leaves two independent detail destinations stable.
- In a new app with deep links or notification actions, DeepLinkingFeature
  validates opening requests and owns the durable pending list shown in Settings.
  Save the safe data needed to identify and present each request before adding
  it to the visible pending list or confirming it was kept. Surface an initial
  save failure and leave the pending list unchanged. If a request arrives
  during restoration, preserve both the saved requests and the new request.
  A delayed restore must leave opened requests removed and unrelated requests
  available.
  If the saved list is unreadable, report the error and preserve the file.
  Resume accepting durable requests only after the list can be read or the
  product’s explicit recovery flow resolves the failure. Verify that a retry
  after recovery saves the new request alongside existing ones.
  Handle expired or unavailable destinations clearly. Record incoming URLs
  and user actions on local or push notifications.
  Scheduling or delivery alone does not create a pending item. The receiving
  scene owns navigation and protects unsaved edits and active payments. Any
  scene can open a shared pending request without changing another scene’s
  navigation. Deduplicate callbacks for the same opening event. Keep separate
  opening events distinct even when they point to the same destination.
  Coordinate competing opens and dismissals by request identity. Keep other
  requests available while one scene decides whether to navigate. Persist
  removal after actual navigation or explicit dismissal. Leave requests pending
  when navigation is declined, cancelled before it opens, or fails. Cancellation
  after navigation still counts as an open. If removal fails after navigation,
  report the storage error and retry removal without navigating again. The
  request can reappear after restart until removal is saved. If an explicit
  dismissal cannot be saved, report the error and keep the request pending for
  retry. The destination owns its content loading. Add a
  separate notification history or global navigation router only when the
  product requires one. Preserve existing deep-link, notification and history
  behaviour during migration.
- A normal preview constructs the View, for example #Preview { NotesEditorView() }.
  The View constructs its own ViewModel, whose default Feature dependency comes
  from AppModel.shared. Keep SwiftData containers and contexts out of previews.
- Keep Views declarative. Feature state and business decisions belong outside
  the View layer. Reusable presentation components may receive display values,
  bindings and action closures that forward intent to their owning screen and
  its ViewModel. For example, a RefreshButton can forward a tap to the
  owning screen's ViewModel. Verify that the component holds no ViewModel
  and calls no Feature or service directly. Keep service closures and other
  screens' ViewModel actions out of screen inputs.
- Published domain snapshot structs use let properties and immutable contents.
  Check nested values and collection elements for references that can change
  in place. Publish a replacement snapshot after a confirmed change.
  The screen ViewModel owns temporary unsaved editor values. If a durable save
  fails, keep the draft available for retry, preserve previously confirmed state
  and present a recoverable error on the screen. Discard the draft when the user
  cancels editing, and publish confirmed changes only after required persistence succeeds.
- When a value is genuinely shared across the app, define it once as a static
  property on a purpose-named enum. Add it when several callers use the same
  app-wide concept, such as a company website shared through AppLinks.
  Start a new app without a constants enum until such a value is needed.
  Equal literals can still represent separate concepts.
  App-wide system constants may live in a purpose-named folder beside
  AppModel. Keep Feature-specific values with their Feature. Use authoritative
  bundle metadata for app identity and localization resources for translatable
  text. Keep secrets out of app constants.
- Features own authoritative application state. Microservices can own internal
  request bookkeeping, caches or database machinery under suitable isolation.
  Check whether any service becomes a second authority for the same business state.
- Start with independent Features. A ViewModel can arrange existing capabilities
  for its screen. When a reusable business workflow genuinely spans Features,
  put its decisions in the Feature that owns the workflow, or introduce a
  coordinating Feature for a distinct capability. Trace dependencies for
  cycles and keep one authoritative owner for each value.
- For sign-out, account switching or external session expiry, let the owning
  Feature coordinate explicit cleanup calls. Each affected Feature clears the
  data it owns. Trace each supported entry point and reconcile the outcome with the actual session, including partial
  authentication failures. Verify that external expiry reaches its owner
  with the account screen closed. Preserve the session and its data when
  sign-out fails before ending the session. Clear the ended
  session's Feature state and report cleanup failures accurately. A cleanup
  failure after sign-out does not restore the session. During a switch, keep
  the previous session's data out of the new session. Check the account or
  session generation before publishing in-flight results, even when the earlier
  task was cancelled. If the same account can sign back in before old work
  finishes, check the session identity. Verify that late
  writes cannot recreate cleared data and delayed cleanup cannot delete records
  written by the new session.
  If sign-out promises a fresh-install experience, clear account-specific
  memory, caches and locally stored files. Preserve independent purchases and
  user-owned documents. Handle unsynchronised work according to the product
  contract.
- AppModel exposes concrete Features and keeps a private launch guard and the
  private task handles needed for app-wide listeners. Its initializer assigns
  the supplied Features, sets the guard to false and sets the handles to nil.
  One static live() factory constructs production dependencies for
  AppModel.shared. Keep services, ViewModels and other presentation state
  out of AppModel's stored properties.
- AppModel starts each needed app-wide listener once and forwards events to
  the responsible Feature. Define how asynchronous listeners stop or are
  replaced when needed, including in isolated tests. A listener intended to
  run for the app's lifetime may run until termination. The Feature interprets
  events and owns the resulting state. Screen-only observation follows the
  screen's lifetime. Verify that repeated startup signals leave one listener
  and that events still reach the Feature with no relevant screen open.
  If cancellation is supported, verify that the cancelled listener stops
  forwarding events. If replacement is supported, also verify that cleanup
  of the old listener leaves the replacement running. For observer-backed
  streams that support resubscription, deliver a late event from the old
  registration and verify it cannot update the replacement. Verify delayed
  teardown removes only the old registration. Stop isolated listeners after tests.
- Features own their background capabilities. During synchronous launch,
  AppModel can ask each Feature to register its permitted BGTaskScheduler
  identifiers once before launch finishes. Schedule work separately. The system
  decides when eligible work runs. Route app-level callbacks through AppModel
  to the owning Feature. Cancel work on expiration and
  verify that success, failure and expiration each complete the system
  callback exactly once, including when expiration races completion. Work
  may outlive a screen, but continuing after iOS backgrounds the app requires
  a supported system mechanism, such as a background URLSession for eligible
  transfers. Background push delivery is best effort. An ordinary Swift Task
  grants no background runtime. Record actual background delivery on a
  supported device separately from controlled handler tests.
- When adding a device or extension target or changing shared Model code or
  services used by an existing target, verify that each affected target includes
  the shared Model and only its own Views and ViewModels. Each process has its
  own AppModel and Feature instances. Adapt composition and platform services
  for each target while reusing the same business rules. For an App Group
  widget snapshot, request a timeline reload only after a successful write.
  Verify that a failed write issues no request. WidgetKit controls reload timing.
  Share immutable snapshots sized for what the receiving presentation needs.
  A Watch on another device cannot read the iPhone’s App Group container.
  Send it a separate snapshot through a suitable transfer, such as Watch
  Connectivity. Observation publishes changes within each process after
  transfer or synchronization delivers the data. Build each affected target and check API availability
  and lifecycle requirements. Verify that existing data handoffs still work.
  Separately verify the handoff on supported
  devices, including how receiving Features refresh their state and handle
  missing, unreadable, delayed and stale snapshots. If multiple targets can
  edit the same data, verify the product's conflict policy.
- Keep Features explicitly on MainActor. Networking, persistence and expensive
  processing use an appropriate service isolation boundary off MainActor by
  default. Keep framework-required MainActor calls in a narrow adapter.
  A separate type or async declaration alone does not move work off MainActor.
- Keep Views and their adjacent ViewModels under 1 - View and keep AppModel,
  Features and their microservices under 2 - AppModel. Name folders for the
  responsibilities they contain. Put independently reusable Views in their own
  files and keep private implementation details beside their owner. When
  moving files, verify target membership, resource lookup and affected builds.
- Reserve 4 - Swift Extensions for broadly reusable Swift standard library and
  Foundation extensions. Keep SwiftUI and UIKit extensions in the View layer.
  Keep purpose-specific extensions and protocols with their owners.
- Keep domain values with the Feature that defines their meaning, even if
  they are Codable or persisted. Keep storage-only records inside persistence
  and transport-only payloads inside the provider or adapter that maps them.
- SwiftDataManager owns container and context creation. Keep SwiftData records
  and contexts inside the storage boundary and give Features narrow load and
  save operations that return immutable Sendable domain values. Use a
  dedicated @ModelActor for non-trivial production database work. Verify
  where the context is created and that expensive work executes off MainActor.
  Keep any deliberately UI-owned context limited to work proven short.
- Route URLSession requests through NetworkingManager. Composition code may
  configure and inject the session. Keep response validation and decoding
  with each Feature-specific API adapter. In new apps, start with a stateless
  value type when it meets the session and concurrency requirements.
  Keep independent requests able to progress in parallel unless an explicit
  policy limits them. An actor can protect shared request state while another
  request starts during a suspended call. Check request limits and session
  configuration and measure the suspected wait before changing isolation. When changing networking, hold one response open and
  verify that an independent request reaches the transport before it completes.
- Keep domain-specific microservices beside the Feature that naturally owns
  their responsibility, even when another Feature uses them. Move broadly
  applicable services to a shared location when no Feature naturally owns
  them. When common configuration or shared state warrants one instance,
  construct it locally in AppModel.live() and inject it through each
  consumer's initializer. Otherwise use the simplest value or instances
  that meet the requirements.
- Call the AppModel launch signal directly
  and synchronously from the application lifecycle callback, never a View .task
  or a scheduled Task. AppModel signals the relevant Features and starts its
  required app-wide listeners before the callback returns. For an asynchronous
  listener, AppModel creates and retains its task during startup. Features can start
  their own asynchronous work without delaying the callback for disk or network
  completion. Verify that repeated callbacks leave Feature startup signals
  and app-wide listeners unduplicated.
  If a screen requests the same refresh while launch work is in flight,
  verify that equivalent requests share one execution by default.
  Keep synchronous startup work brief. Task creation order gives no guarantee
  about when disk or network work begins. Measure launch and first-frame
  timing separately from completion of Feature work.
- A Feature-owned shared refresh normally continues when a screen leaves, even
  if it was the only caller. Later equivalent callers can join while the request
  is in flight, and the Feature retains a successful result. Use another
  cancellation policy only for a specific product or resource requirement.
  Awaiting the shared task handle does not end the wait on caller cancellation.
  If the screen needs to stop waiting promptly, cancel its wait independently
  while the Feature keeps refreshing. Verify separately that the last waiter
  can leave without a replacement, that other waiters still receive the result
  when one leaves, and that a later equivalent caller joins without a duplicate
  request. Where prompt exit is required, verify it while the refresh is suspended.
- SwiftUI Views never store task handles, including in @State. The ViewModel
  owns explicitly created screen tasks and retains their named handles.
  Name task handles and collections for the work and lifetime they represent.
  Use a qualifier such as initial only when the task is limited to that phase.
  A synchronous button action can return the existing handle when repeated
  calls are equivalent. Async callers await that same handle's value.
  Install the handle before suspension and clear it after handling success,
  failure or cancellation. If replacement can start before the old task exits,
  use task identity to reject stale results and clear the handle only when
  that identity still matches. In a controlled test, finish the old task
  after installing its replacement. Verify that the old result and cleanup
  leave the current state and replacement handle intact. Keep
  SwiftUI lifecycle tasks and structured child tasks with their existing owners. Await directly when the current task owns the work.
- Cancel superseded presentation work such as search. Cancel screen-only work
  on disappearance when continuing would have no value. Check cancellation
  before expensive work and before publishing, and protect current state
  against stale results after suspension.
- At the Feature boundary, equivalent requests await one in-flight task and
  receive its outcome. Queue commands that must each take effect
  in admission order, including across awaits, and return each caller's own
  outcome. Matching inputs alone do not make commands duplicates. Define how
  failure and cancellation affect queued work and when to clear task handles.
  Document the product reason for a different overlap policy. To verify
  ordered commands, hold the first one open and submit further commands,
  including identical inputs that must each take effect. Check their admission
  order and individual outcomes, and verify a failure leaves later work able
  to finish.
- PurchasesFeature owns entitlement state. Screen ViewModels check current
  entitlement before presenting or calling a paid capability. Identify paid
  capabilities from the product requirements and entitlement policy. Trace
  alternative screens, deep links, notification actions and additional targets
  that reach the capability. A route that bypasses the screen checks current
  entitlement in its own caller before invoking the capability. Verify locked
  and entitled outcomes for each applicable route. If access can change
  during a suspension before use, check it again after resuming and verify
  this behaviour with a controlled test. Cite the source and consequence of confirmed unguarded paths, and mark unresolved paths as
  unverified. Keep pricing and entitlement checks out of the capability
  Feature so the product can change which capabilities it charges for.
  Protected server operations enforce their own access policy.
- Keep confirmed data, operation state and failure outcomes as separate
  Feature values so data stays usable during loading and recovery. The
  ViewModel owns screen-specific error text. A failed optional cache write
  leaves a successful refresh usable. Only saved data counts as available offline.
- Publish durable user edits as saved only after required persistence succeeds.
  Persist individual changes by stable record identity. Reserve whole-dataset
  replacement for explicit operations with their own integrity rules.
  For simple preferences, update UserDefaults before publishing the value. Its
  setter confirms the in-memory update only. Use a storage API that reports
  write outcomes when the product requires confirmed persistence.
- Use the product-defined fallback when a non-critical preference is missing
  or its recognised stored format contains an obsolete value. For example,
  use system appearance for a retired theme. Replace an old
  saved value only through an intentional migration or a successful user choice.
  Report unreadable or corrupt durable storage and failed durable writes as errors.
- Start remote refresh and optional cache restoration independently when both
  are needed. Publish current server data and complete the refresh for its
  callers without waiting for the cache write. A failed cache write leaves
  fresh data visible and the refresh successful. In a controlled test, hold
  the cache write open and verify that the fresh data is visible and the
  refresh caller has returned before releasing the write.
  Keep valid in-memory data if refresh fails, and prevent older restores from
  replacing fresher data from the same source. Let other independent sources
  restore their usable cached data. Bound cache-write retries, preserve the last usable
  cache if replacement fails, and prevent older writes from replacing newer
  snapshots. Report offline availability only for data that was saved. Use JSON
  by default for a simple cache. A missing, incompatible or unreadable cache
  supplies no restored data. Help apply Instant Loading binary snapshots only
  on request and for a sufficiently stable format with safe decoding. Avoid
  proposing binary snapshots during app creation or migration.
- Add offline editing or cross-device sync when the product needs it. Choose
  SwiftData with CloudKit or iCloud documents only when suitable for the data
  and targets. Keep live SwiftData stores out of iCloud Drive. For a custom
  server, follow its sync contract. Save each offline edit and its pending-sync
  metadata together before reporting local success. Report server confirmation
  separately. Force a local write failure and verify that it neither reports
  local success nor makes the edit eligible for upload. Fail sync after a
  successful local save, restart, and retry with the same edit identity.
  Also simulate a lost reply after the server applies the edit. Verify that
  retry confirms the original edit without applying it again. Check the agreed
  conflict and rejection outcomes. When changing
  existing sync code, verify that the updated app restores and safely retries
  a pending edit persisted by the previous implementation. Verify Apple-managed
  sync and conflicting offline edits on supported devices with the required
  capabilities, account and schema.
- App.body declares scenes and app-wide presentation dependencies. Install a
  stable root View in each WindowGroup. Keep stored AppModel references out
  of App. Keep startup conditions, database access and Feature loading or
  error UI out of App and root navigation. Verify that each scene keeps its
  root available while Features load or fail. Feature screens present their
  own loading and errors through their ViewModels.
- Database availability must never gate the interface, including root wrappers
  or blocking overlays. Open storage lazily within a Feature's data request.
  The storage owner prepares the parent directory at the configured store URL
  before opening a file-backed store. Directory and opening failures follow
  the request through Feature, ViewModel and screen. Retry the same request
  while preserving the configured location and existing data. Retry opening
  if the store never opened, and reuse the working container if only a fetch
  failed. Surface a failed initial fetch as an error and keep previously loaded
  data visible if a refresh fails. Verify that the root appears and independent
  navigation works while the initial open is pending and after it fails.
  Separately verify that retry after a fetch failure reuses the opened store.
- During migration, preserve business behaviour, user-facing capabilities,
  stored data and meaningful interactions. Limit implementation changes to
  the agreed CFA and Swift Concurrency migration and supported platforms.
  Fix confirmed defects within scope, protect the intended behaviour with
  tests, and record any necessary platform-driven differences. Compare the
  migrated journeys and access to saved data with the baseline. Link baseline
  and final-commit evidence for each in-scope behaviour. Record the required
  manual regression results with the tested build and environment. Classify
  observed differences and resolve regressions or unexplained changes before
  calling the migration complete. Before handoff,
  trace remaining legacy and Swift Concurrency paths together. Identify
  remaining callers of legacy dependencies and record which adapters were
  removed or retained to preserve behaviour or platform support. Reconcile
  temporary file locations, Xcode navigator groups and target membership.
  Audit the agreed migration scope against CFA, correct in-scope discrepancies
  and rerun affected builds and tests after corrections.
- Inject a clock or date function when a business rule depends on current
  time. Read it in the Feature at the point of decision. Test date and time-zone
  boundaries with controlled inputs, and advance the clock on the same
  Feature instance when it must operate across a date change. A View may
  read time directly for transient visuals.
- Give each ViewModel its own named test file and suite under View model tests.
  Give each concrete Feature a named API test file under FeatureTests. When
  adding or moving tests, verify membership in the intended test target and
  keep test sources out of the production app target. Run the affected tests.
- Do not call an app CFA merely because it has numbered folders. Trace real
  ownership, AppModel composition, and the focused tests for the changed work.

This project guidance supplements the developer's request; it does not replace
the installed CFA skills or authorise unrelated changes.
`;

function bundledGuidance(content) {
  const start = content.indexOf(guidanceMarker);
  if (start < 0) return '';
  const end = content.indexOf('the installed CFA skills or authorise unrelated changes.', start);
  return content.slice(start, end < 0 ? undefined : end);
}

function guidanceDiffersFromBundled(block) {
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  return normalize(block) !== normalize(bundledGuidance(projectGuidance));
}

const guidanceComparison = 'Compare the CFA block with the installed toolkit and keep project-specific rules.';

function usage() {
  console.log(`CFA AI Toolkit for iOS — cfa command

Usage:
  cfa dashboard [project-folder] [dashboard options]
  cfa inspect [project-folder] [--json]
  cfa doctor [project-folder]
  cfa enable-project [project-folder] [--host auto|codex|claude]

Examples:
  cfa dashboard
  cfa dashboard ~/Developer/MyApp
  cfa dashboard ~/Developer/MyApp --include-tests
  cfa inspect ~/Developer/MyApp
  cfa doctor ~/Developer/MyApp
  cfa enable-project ~/Developer/MyApp --host claude

`);
}

function installedSkillsRoot() {
  let current = scriptDirectory;
  while (current !== path.dirname(current)) {
    if (path.basename(current) === 'cfa-architecture-review') return path.dirname(current);
    if (fs.existsSync(path.join(current, 'SKILL.md'))) return path.dirname(current);
    current = path.dirname(current);
  }
  return undefined;
}

function projectDirectory(value) {
  const project = path.resolve(value ?? process.cwd());
  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    throw Error(`Project folder does not exist: ${project}`);
  }
  return project;
}

function guidanceFiles(project) {
  return ['AGENTS.md', 'CLAUDE.md']
    .map((name) => path.join(project, name))
    .filter((file) => fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(guidanceMarker));
}

function doctor(projectArgument) {
  const project = projectDirectory(projectArgument);
  const skillsRoot = installedSkillsRoot();
  const missingSkills = skillsRoot
    ? cfaSkillNames.filter(name => !fs.statSync(path.join(skillsRoot, name, 'SKILL.md'), { throwIfNoEntry: false })?.isFile())
    : cfaSkillNames;
  const missingReferences = skillsRoot ? cfaSkillNames
    .filter(name => !missingSkills.includes(name))
    .flatMap(name => {
      const references = ['swift-coding-guide.md'];
      if (name !== 'swift-code-quality') references.push('cfa-specification.md', 'cfa-change-gate.md', 'spec/README.md');
      return references.map(file => path.join(name, 'references', file))
        .filter(file => !fs.statSync(path.join(skillsRoot, file), { throwIfNoEntry: false })?.isFile());
    }) : [];

  if (missingSkills.length === 0 && missingReferences.length === 0) {
    console.log(`PASS CFA skills are installed: ${skillsRoot}`);
  } else if (skillsRoot) {
    if (missingSkills.length) console.log(`WARN missing CFA skills: ${missingSkills.join(', ')}`);
    for (const file of missingReferences) console.log(`WARN missing CFA reference: ${file}`);
  } else {
    console.log('WARN this CFA command is not running from an installed CFA skill.');
  }

  const guidance = guidanceFiles(project);
  if (guidance.length > 0) {
    console.log(`INFO CFA project guidance found: ${guidance.join(', ')}`);
    for (const file of guidance) {
      const content = bundledGuidance(fs.readFileSync(file, 'utf8'));
      if (guidanceDiffersFromBundled(content)) {
        console.log(`INFO CFA guidance differs from the installed toolkit in ${file}. ${guidanceComparison}`);
      }
      if (content.includes(outdatedFeatureGuidance)) {
        console.log(`WARN outdated feature naming guidance in ${file}; update the CFA guidance block to use concrete *Feature types and matching *Feature properties.`);
      }
      if (content.includes(outdatedDependencyFlow)) {
        console.log(`WARN outdated CFA dependency guidance in ${file}. ${dependencyFlowUpdate}`);
      }
      if (content.includes(outdatedServiceGuidance)) {
        console.log(`WARN outdated service guidance in ${file}. ${serviceGuidanceUpdate}`);
      }
      if (content.includes(outdatedScreenGuidance) || (previousInlineScreenGuidance.test(content) && !content.includes(detailScreenGuidance))) {
        console.log(`WARN outdated screen ownership guidance in ${file}. ${screenGuidanceUpdate}`);
      }
      if (content.includes(outdatedDeepLinkGuidance) || content.includes(outdatedPendingSaveGuidance) ||
          content.includes(outdatedDismissalGuidance)) {
        console.log(`WARN outdated deep-link guidance in ${file}. ${deepLinkGuidanceUpdate}`);
      }
      if (content.includes(outdatedSnapshotGuidance)) {
        console.log(`WARN outdated snapshot guidance in ${file}. ${snapshotGuidanceUpdate}`);
      }
      if (content.includes(outdatedSharedWaitGuidance)) {
        console.log(`WARN outdated shared-refresh guidance in ${file}. ${sharedWaitGuidanceUpdate}`);
      }
      if (content.includes(outdatedStartupGuidance)) {
        console.log(`WARN outdated startup guidance in ${file}. ${startupGuidanceUpdate}`);
      }
      if (content.includes(outdatedAppModelGuidance)) {
        console.log(`WARN outdated AppModel guidance in ${file}; update the CFA guidance block to allow private task handles for app-wide listeners.`);
      }
    }
  } else {
    console.log(`INFO no optional CFA project guidance in ${project}`);
    console.log(`Run: cfa enable-project ${JSON.stringify(project)}`);
  }

  if (missingSkills.length || missingReferences.length) process.exitCode = 1;
}

function parseEnableProjectArguments(values) {
  let host = 'auto';
  let project;
  while (values.length > 0) {
    const value = values.shift();
    if (value === '--host' && values[0]) host = values.shift();
    else if (!value.startsWith('--') && !project) project = value;
    else throw Error(`Unknown or incomplete option: ${value}`);
  }
  if (!['auto', 'codex', 'claude'].includes(host)) {
    throw Error(`Unsupported host: ${host}. Use auto, codex, or claude.`);
  }
  return { host, project: projectDirectory(project) };
}

function enableProject(values) {
  const { host, project } = parseEnableProjectArguments(values);
  const codexFile = path.join(project, 'AGENTS.md');
  const claudeFile = path.join(project, 'CLAUDE.md');
  const guidanceFile = host === 'codex'
    ? codexFile
    : host === 'claude'
      ? claudeFile
      : fs.existsSync(codexFile)
        ? codexFile
        : fs.existsSync(claudeFile) || fs.existsSync(path.join(project, '.claude'))
          ? claudeFile
          : codexFile;

  const existingGuidance = fs.existsSync(guidanceFile) ? fs.readFileSync(guidanceFile, 'utf8') : '';
  const block = bundledGuidance(existingGuidance);
  if (block) {
    console.log(`CFA project guidance is already enabled: ${guidanceFile}`);
    if (guidanceDiffersFromBundled(block)) {
      console.log(`The existing CFA guidance differs from the installed toolkit. ${guidanceComparison}`);
    }
    if (block.includes(outdatedFeatureGuidance)) {
      console.log('The existing guidance still uses the old Manager rule. Edit only the CFA guidance block; the command will not overwrite project instructions.');
    }
    if (block.includes(outdatedDependencyFlow)) {
      console.log(`Update the existing CFA dependency guidance block. ${dependencyFlowUpdate}`);
    }
    if (block.includes(outdatedServiceGuidance)) {
      console.log(`Update the existing CFA service guidance block. ${serviceGuidanceUpdate}`);
    }
    if (block.includes(outdatedScreenGuidance) || (previousInlineScreenGuidance.test(block) && !block.includes(detailScreenGuidance))) {
      console.log(`Update the existing CFA screen ownership guidance block. ${screenGuidanceUpdate}`);
    }
    if (block.includes(outdatedDeepLinkGuidance) || block.includes(outdatedPendingSaveGuidance) ||
          block.includes(outdatedDismissalGuidance)) {
      console.log(`Update the existing CFA deep-link guidance block. ${deepLinkGuidanceUpdate}`);
    }
    if (block.includes(outdatedSnapshotGuidance)) {
      console.log(`Update the existing CFA snapshot guidance block. ${snapshotGuidanceUpdate}`);
    }
    if (block.includes(outdatedSharedWaitGuidance)) {
      console.log(`Update the existing CFA shared-refresh guidance block. ${sharedWaitGuidanceUpdate}`);
    }
    if (block.includes(outdatedStartupGuidance)) {
      console.log(`Update the existing CFA startup guidance block. ${startupGuidanceUpdate}`);
    }
    if (block.includes(outdatedAppModelGuidance)) {
      console.log('The existing AppModel guidance should allow private task handles for app-wide listeners. Edit only the CFA guidance block.');
    }
    return;
  }

  const prefix = existingGuidance.trim().length > 0 ? '\n\n' : '';
  fs.appendFileSync(guidanceFile, `${prefix}${projectGuidance}`);
  console.log(`Enabled CFA project guidance: ${guidanceFile}`);
}

function dashboard(values) {
  let project = process.cwd();
  if (values[0] && !values[0].startsWith('--')) project = values.shift();
  const hasOutput = values.includes('--out');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(path.resolve(project), `cfa-dashboard-${stamp}`);
  const dashboardArgs = [project, ...(hasOutput ? [] : ['--out', output]), ...values];
  const result = spawnSync(process.execPath, [dashboardCLI, ...dashboardArgs], {
    stdio: 'inherit',
    shell: false
  });
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}

async function inspectProject(values) {
  let project;
  let json = false;
  while (values.length > 0) {
    const value = values.shift();
    if (value === '--json') json = true;
    else if (!value.startsWith('--') && !project) project = value;
    else throw Error(`Unknown or incomplete option: ${value}`);
  }
  const report = await inspect(projectDirectory(project));
  console.log(json ? JSON.stringify(report, null, 2) : renderInspection(report));
}

try {
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    usage();
  } else {
    const command = args.shift();
    if (command === 'dashboard') dashboard(args);
    else if (command === 'inspect') await inspectProject(args);
    else if (command === 'doctor') doctor(args.shift());
    else if (command === 'enable-project') enableProject(args);
    else throw Error('Unknown CFA command. Run: cfa --help');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
