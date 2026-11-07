# CFA-SPEC-ACCOUNT-01: Coordinate account changes explicitly

**Applies when:** Sign-out, account switching or session expiration affects other Features.

**Strength:** Default.

**Guidance:** UserProfileFeature may call affected Features directly; if sign-out fails before the session ends, retain the session and account data. After success clear affected state and prevent stale requests republishing old data.

**Why:** A visible direct workflow avoids unnecessary event infrastructure while protecting account data.

**Example:** After successful sign-out, UserProfileFeature asks OrdersFeature and FavouritesFeature to clear account data.

**Verify:** Test failed and successful sign-out, account switch, in-flight requests and partial authentication outcomes.

**Full rule, context and examples:** [Define Features by Business Capability, Not by Screen or Tab](../topics/16-define-features-by-business-capability-not-by-screen-or-tab.md). This card is a reading aid; apply the complete canonical section.
