# CFA-SPEC-CACHE-01: Use optional snapshots without blocking fresh data

**Applies when:** Caching replaceable server data.

**Strength:** Required when using this cache pattern.

**Guidance:** Start restoration and refresh independently where both are needed. A missing, incompatible or unreadable cache must not block the download. Publish a current response without waiting for the optional cache write. Reject older restores after fresh data arrives, and keep valid in-memory data if refresh fails. Bound cache write retries, preserve an existing good cache on write failure, and prevent older writes from replacing newer snapshots. Claim offline availability only for a saved cache. Use JSON by default when a simple cache is appropriate. Help apply Instant Loading binary snapshots only on request for a stable format with safe decoding. Do not propose binary snapshots during app creation or migration. Durable user edits still require successful persistence before publication as saved.

**Why:** Previously downloaded data can appear quickly without sacrificing fresher server data.

**Example:** In the bundled CFA App template, GitReposFeature publishes a fresh response before its optional cache write completes and rejects an older cache restore.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Verify refresh starts with a missing, incompatible or slow cache. Verify that cache write failure leaves fresh results usable, late restoration cannot replace them, and refresh failure retains valid in-memory data. Verify that failed replacements retain the previous cache and delayed writes cannot replace a newer snapshot.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
