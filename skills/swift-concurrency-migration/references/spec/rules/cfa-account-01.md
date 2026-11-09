# CFA-SPEC-ACCOUNT-01: Coordinate account changes explicitly

**Applies when:** Sign-out, account switching or session expiration affects other Features.

**Strength:** Default.

**Guidance:** UserProfileFeature may call affected Features directly; if sign-out fails before the session ends, retain the session and account data. If authentication reports a partial failure, reconcile the actual session. Once the session ends, clear affected state, keep the app signed out and report any cleanup failure. Check the current account or session generation before publishing an in-flight result, including when the request has been cancelled. Use session identity if a new session for the same account can overlap earlier work. If sign-out promises a fresh-install experience, also clear account-specific memory, caches and locally stored files. Handle unsynchronised work transparently and preserve independent purchases and user-owned documents.

**Why:** A visible direct workflow avoids unnecessary event infrastructure while protecting account data.

**Example:** After successful sign-out, UserProfileFeature asks OrdersFeature and FavouritesFeature to clear account data.

**Verify:** Trace sign-out, account switching and external session expiry. Test intact sessions after failed sign-out, cleanup after success, an ended session with failed cleanup, and partial authentication outcomes. Complete an old request after the session changes and verify that it cannot publish, even if cancellation was requested or the same account has signed back in. Check retained data against the product’s sign-out contract.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
