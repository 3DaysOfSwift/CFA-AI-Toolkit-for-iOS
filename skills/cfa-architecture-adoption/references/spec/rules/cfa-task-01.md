# CFA-SPEC-TASK-01: Define task ownership and overlapping-call policy

**Applies when:** Starting asynchronous operations.

**Strength:** Required.

**Guidance:** Define overlap policy at the Feature boundary. By default, equivalent calls share one execution and commands that must each take effect queue in admission order across suspension points, with an outcome for each caller. Decide equivalence from the intended behaviour as well as the inputs. Admit identical inputs separately when each command must take effect. Document the product reason for another policy, such as latest-request-wins. Features own work that must outlive a screen.

**Why:** Task lifetime and repeated actions remain predictable.

**Example:** Two equivalent reload callers await the same Feature-owned task. See the bundled Habit Tracker Pro HabitsFeature under 2 - AppModel/Features/Habits.

**Explanation:** [Two callers. One refresh. No lost edits.](https://www.3daysofswiftconcurrency.com/cfa/explanation/overlapping-requests).

**Related reading:** [Unstructured tasks need an owner—not a ban](https://www.3daysofswiftconcurrency.com/cfa/explanation/unstructured-tasks).

**Verify:** Verify equivalent requests share an outcome from one execution. Suspend the first admitted command, then submit further commands, including identical inputs. Verify that each required command executes in admission order, each caller gets its own outcome, and a failure does not strand later commands. Test cancellation, stale results and cleanup.

**Full rule, context and examples:** [Make Concurrency Behaviour Honest and Visible](../topics/20-make-concurrency-behaviour-honest-and-visible.md). This card is a reading aid; apply the complete canonical section.
