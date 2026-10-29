# Test the promises, not the folder names

Topic: `behavioural-testing`  
Rules: `CFA-TEST-01`, `CFA-TIME-01`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

Test observable Feature and ViewModel behaviour with isolated dependencies. Inject volatile inputs such as time, and report executed evidence separately from source inspection and unrun runtime checks.

## Problem

A test that merely constructs a type does not test its policy. Uncontrolled time and scheduler-dependent sleeps make boundaries hard to reproduce. Production shared state couples tests.

## Documented rationale

The specification requires tests at the ownership boundaries and deterministic input control. Its unit-test-first template default avoids empty test targets; it does not establish UI correctness.

## Trade-offs and alternatives

Editorial analysis: controllable clocks and barriers require deliberate setup and cleanup. Narrow unit tests cannot replace storage, UI or third-party integration checks where those behaviours matter.

## Scope and exceptions

One named suite is an organization convention, not coverage proof. A stored Date is not an advancing clock. Explicitly scoped UI tests remain valid; no finite passing suite proves all race conditions absent.

## Verification

Exercise success, error, retry, cancellation and overlap where applicable. Bound blocked waits, release barriers in cleanup, and report passed, failed, skipped and not-run checks separately.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Choose an approved example where the same clock-controlled Feature test catches a real day-boundary mistake; avoid invented migration success statistics.

## Publication

Planned explanation path: `/cfa/explanations/behavioural-testing`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
