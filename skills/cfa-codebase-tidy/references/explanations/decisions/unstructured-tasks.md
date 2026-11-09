# Unstructured tasks need a deliberate owner

Topic: `unstructured-tasks`  
Rules: `CFA-TASK-01`, `CFA-TASK-02`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

CFA ViewModels retain named handles for unstructured tasks they create by default. Choose the overlap policy for each operation: callers may share equivalent in-flight work when one result satisfies them all, while commands that must each take effect are executed in the required order. Structured child work and framework-owned lifetimes retain their own owners.

## Problem

A button that starts new independent work on every tap can duplicate commands and makes completion or cancellation hard to reason about. A discarded handle removes a convenient way to coordinate that work; it does not stop the task.

## Documented rationale

The specification distinguishes an awaitable operation from a Task lifetime. A retained handle makes ownership, shared completion and cleanup visible.
Install it before suspension and clear it when the task settles, guarding
against old cleanup clearing a replacement. Awaiting the handle’s value lets
a caller observe completion. Cancelling that caller does not automatically
cancel the unstructured task. Its owner applies the operation’s cancellation
policy. The Feature separately coordinates requests from all callers.

## Trade-offs and alternatives

Editorial analysis: retaining handles adds lifecycle and cleanup obligations. Retain only the operation owners actually need; do not create wrapper tasks to await every repeated tap or force handles onto structured child work.

## Scope and exceptions

Unstructured tasks are not inherently wrong. Swift task semantics are separate from CFA's chosen ViewModel convention. A handle is not automatic cancellation or a guarantee of no retained-object cycle. Durable saves may need to outlive a screen. A Feature-owned shared refresh normally continues when a screen leaves, retaining its result for later use; presentation-only work can stop when it no longer has value.

## Verification

Test the chosen policy: for shareable work, repeat equivalent requests and check that callers share completion; for commands that must each take effect, check that every command runs in the required order. Test failure, cancellation cleanup and a later retry. Check that stale cleanup cannot erase a replacement handle.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

Check how the public worked example presents both lifetimes. The bundled Notes
reference shows a SwiftUI lifecycle task awaiting a ViewModel load handle that
also serves the Retry action, with shared loading owned by the Feature.

## Publication

[Read the public explanation](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks).
Verified on 2026-10-29 for topic relevance, anonymous access, readable code,
desktop/mobile layout and the training footer. The catalogue records the review
evidence. This dated verification does not imply that the page was checked today.
