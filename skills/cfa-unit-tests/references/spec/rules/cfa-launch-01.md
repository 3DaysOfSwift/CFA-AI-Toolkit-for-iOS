# CFA-SPEC-LAUNCH-01: Start the model synchronously

**Applies when:** Handling app launch.

**Strength:** Required.

**Guidance:** Call AppModel startup directly and synchronously from the application delegate callback. AppModel signals the relevant Features and starts its app-wide listeners before the callback returns. Features own their asynchronous work, and launch does not wait for disk or network completion. Keep synchronous startup brief and avoid blocking I/O on the main thread.

**Why:** App-wide startup signals are issued before the delegate returns.

**Example:** The application delegate calls AppModel startup directly; Features start their own asynchronous refreshes.

**Verify:** Trace the direct call from UIApplicationDelegate through each Feature startup signal and app-wide listener start. Verify repeated callbacks do not repeat startup, and measure first-frame responsiveness separately from network and disk completion. Task creation order alone does not establish I/O start order.

**Full rule, context and examples:** [Use Application Launch as an Opportunity to Refresh Features](../topics/21-use-application-launch-as-an-opportunity-to-refresh-features.md). This card is a reading aid; apply the complete canonical section.
