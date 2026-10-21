# Habit Tracker Pro for iOS

A separate, ready-to-open CFA example that adds a **one-time Trends unlock** to
the free Habit Tracker. The original app and its native Xcode template remain
unchanged. This Pro project is not yet an additional File → New template and is
not installed by the toolkit's template installer.

Open `HabitTrackerPro.xcodeproj` in Xcode 26.2 or later, select the
`HabitTrackerPro` scheme and an iPhone simulator, then Run. Deployment: iOS 18+.
The shared scheme selects `HabitTrackerPro/3 - App Resources/Trends.storekit`.
Local StoreKit transactions use simulated money, not a live App Store charge.

## The paid journey

Today, Habits, Day Streak and Settings remain free. Trends opens an illustrative
preview with a price supplied by StoreKit, purchase and restore controls.
A verified purchase unlocks charts for all habits; it is not a subscription.
No app-owned Boolean in UserDefaults grants access.

- Daily activity: the last 30 calendar days, with a target line when configured.
- Weekly consistency: four rolling seven-day windows ending today, each showing
  completed days out of seven. These are not locale-dependent calendar weeks.
- A missing entry counts as an uncompleted day. The current data model has no
  habit creation date, so these graphs deliberately do not claim an adherence
  percentage since creation.
- Graphs read the same live HabitsFeature used by Today. Editing a habit updates
  the charts without copying the collection or opening another database.
- Cancellation leaves access unchanged. Pending approval does not unlock content.
  Verified transaction updates and foreground checks refresh access, including
  refunds/revocation. Unverified purchases never grant access.
- Restore Purchases explicitly asks StoreKit to synchronise, then checks verified
  entitlements. Product-load failures can be retried without blocking free tabs.

## Ownership

| Tab / capability | ViewModel | Feature |
| --- | --- | --- |
| Today | TodayViewModel | TodayFeature |
| Habits | HabitsViewModel | HabitsFeature |
| Day Streak | DayStreakViewModel | DayStreakFeature |
| Trends | TrendsViewModel | TrendsFeature |
| Settings | SettingsViewModel | SettingsFeature |
| Trends paywall | TrendsPaywallViewModel | PurchasesFeature |

TrendsFeature enforces access before exposing paid calculations.
PurchasesFeature owns entitlement and purchase policy. Its StoreKitManager
handles products, verified transactions, updates, finishing transactions and
App Store synchronisation. PurchaseStore is a testable **external-service**
boundary, not a redundant protocol for a Feature.

AppModel.live() constructs the graph. The delegate signals launch; independent
habit loading and store preparation run concurrently without gating navigation.
There is one SwiftDataManager. Persistence schema is unchanged. The new bundle ID
`com.3DaysOfSwiftConcurrency.HabitTrackerPro` gives this duplicate its own sandbox;
it does not import or modify data belonging to the free app.

## Test locally

Use Product → Test. Each Feature and ViewModel has a named suite. Controlled
store doubles exercise purchase outcomes and access rules. The StoreKitTest
integration suite loads the same configuration from the **test bundle**, verifies
a purchase, fresh-feature entitlement recovery and a refund.
The configuration is excluded from the shipping app's Copy Bundle Resources.

In Xcode's StoreKit transaction manager, also exercise pending/Ask to Buy
approval, cancellation, purchase failures and restoration. Check both colour
themes, larger Dynamic Type, and the empty-history state. These manual checks
are distinct from unit tests.

The local test product is:

- ID: `com.3DaysOfSwiftConcurrency.HabitTrackerPro.trends`
- Type: non-consumable
- Example US price: $4.99 (only local configuration; not a pricing recommendation)

## Before distribution

Register your own bundle ID and matching product in App Store Connect, choose
your signing team, complete applicable agreements, configure your actual price
and metadata, and test with Apple's sandbox/TestFlight. The local configuration
does not create a real product or make the app ready for review. Supply original
App Store icon artwork and appropriate privacy/support information.

Local StoreKit testing does not prove live payment, account, storefront or App
Review behaviour. See Apple's documentation for
[transaction updates](https://developer.apple.com/documentation/storekit/transaction/updates),
[current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements)
and [restoring purchases](https://developer.apple.com/documentation/storekit/appstore/sync()).
