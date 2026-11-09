# CFA-SPEC-CACHE-01: Use optional snapshots without blocking fresh data

**Applies when:** Caching replaceable server data.

**Strength:** Required when using this cache pattern.

**Guidance:** Start restoration and refresh independently where both are needed; a successful current response does not wait for an optional cache write and must not be overwritten by an older snapshot.

**Why:** Previously downloaded data can appear quickly without sacrificing fresher server data.

**Example:** In the bundled CFA App template, GitReposFeature publishes a fresh response before its optional cache write completes and rejects an older cache restore.

**Explanation:** [Why use record-level persistence boundaries in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/persistence-boundaries).

**Verify:** Test missing, corrupt, slow and failed cache operations and out-of-order completion.

**Full rule, context and examples:** [Keep Persistence Behind Repository Contracts](../topics/19-keep-persistence-behind-repository-contracts.md). This card is a reading aid; apply the complete canonical section.
