# Unstructured tasks need a deliberate owner

Topic: `unstructured-tasks`  
Rules: `CFA-TASK-01`, `CFA-TASK-02`  
Classification: mixed  
Status: documented basis with editorial analysis; not a founder-approved historical decision record.

## Rule

CFA ViewModels retain named handles for unstructured tasks they create by default. Equivalent repeated actions reuse the existing execution. Structured child work and framework-owned lifetimes retain their own owners.

## Problem

A button that starts new independent work on every tap can duplicate commands and makes completion or cancellation hard to reason about. A discarded handle removes a convenient way to coordinate that work; it does not stop the task.

## Documented rationale

The specification distinguishes an awaitable operation from a Task lifetime. A retained handle makes ownership, shared completion and cleanup visible. It does not itself implement the Feature's independent overlap policy.

## Trade-offs and alternatives

Editorial analysis: retaining handles adds lifecycle and cleanup obligations. Retain only the operation owners actually need; do not create wrapper tasks to await every repeated tap or force handles onto structured child work.

## Scope and exceptions

Unstructured tasks are not inherently wrong. Swift task semantics are separate from CFA's chosen ViewModel convention. A handle is not automatic cancellation or a guarantee of no retained-object cycle. Durable saves may need to outlive a screen.

## Verification

Repeat equivalent actions and assert one execution and shared completion. Test failure, cancellation cleanup and a later retry. Check that stale cleanup cannot erase a replacement handle.

## Evidence and provenance

Canonical source sections are listed in this topic's entry in [the catalogue](../catalogue.json).
The notes synthesise current written guidance. They do not establish who considered
an alternative, prove a performance improvement, or certify a migration outcome.
Matthew Thomas authorised this documented-rationale/editorial-analysis distinction
on 2026-10-27. That permission is not individual technical or historical approval.

## Open question

The public worked example should show both the ordinary retained-task path and the legitimate framework-owned .task exception, with an explicit lifetime policy.

## Publication

Planned explanation path: `/cfa/explanations/unstructured-tasks`.
Not published or verified. Do not offer that path as a working link.
Use the local explanation directly until the catalogue contains a verified URL.
