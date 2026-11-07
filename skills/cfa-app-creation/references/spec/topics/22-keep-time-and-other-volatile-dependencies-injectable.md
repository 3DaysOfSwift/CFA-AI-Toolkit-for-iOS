## Keep Time and Other Volatile Dependencies Injectable

Business decisions involving the current date use an injected clock or date
function. Do not scatter `Date.now` through Views and ViewModels when the value
changes a business result.

Use a closure when production time must continue advancing:

```swift
let currentDate: @MainActor () -> Date = { .now }
```

Tests replace it with a fixed value. A stored `Date` is not a clock and becomes
stale. Views may use the current time solely for ephemeral visual presentation;
domain comparisons and date boundaries come from the feature layer.

Apply the same principle to randomness, identifiers, locale-sensitive business
rules, and external clients when deterministic tests require control.

Feature APIs should express date-relative business intent directly—such as
`todaysEntry`, `currentWeekSnapshot`, or `recordCoffeeToday`—instead of requiring
each ViewModel to obtain the date and reconstruct what “today” means.

