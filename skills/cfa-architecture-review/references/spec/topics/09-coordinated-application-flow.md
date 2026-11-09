## Coordinated Application Flow

Trace each business operation from its entry point to the Feature that owns
it. For a screen action, the View passes intent to its ViewModel, which calls
the Feature. The Feature applies the business rules, calls internal
microservices when needed and publishes the state the screen observes. For
example, a schedule refresh reaches the schedule Feature before it reaches
a network provider. The Feature owns the schedule and decides when to
publish the new snapshot.

