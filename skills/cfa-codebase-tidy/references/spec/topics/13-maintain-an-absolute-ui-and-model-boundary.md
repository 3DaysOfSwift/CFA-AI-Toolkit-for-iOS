## Maintain an Absolute UI and Model Boundary

`1 - View` owns presentation. `2 - AppModel` owns application behaviour.

The UI may decide:

- layout, colour, typography, animation, focus, transitions, and accessibility;
- whether a sheet, alert, menu, or navigation destination is visible;
- which chart point is highlighted;
- how model-provided information is formatted for display;
- whether a control is visually enabled using a decision already exposed by
  its ViewModel.

The UI must not decide:

- whether domain data is valid;
- what a domain-positive, domain-negative, complete, failed, or stale result
  semantically means;
- how values are calculated, classified, filtered, projected, or persisted;
- whether a date qualifies for a streak;
- which content should be selected or cycled;
- whether a purchase grants an entitlement;
- when data should be refreshed as part of an application workflow;
- how two or more feature operations form one business transaction.

Use this extraction test:

> Imagine adding an Apple Watch target to the Xcode project. Could the team
> create a working prototype in less than an hour without changing AppModel or
> any of its features? Every capability and its tested business logic should
> already exist in the Model—the AppModel layer—and be ready for a new UI to
> use.
>
> If the Apple Watch prototype requires a business decision to be copied from
> an iPhone View or ViewModel, business logic has leaked into the UI. Extract
> that decision into the Model layer and place it in the Feature that
> owns the feature.

There is zero tolerance for business logic in the UI layer. Do not excuse it
because the calculation is short, because SwiftUI makes it convenient, or
because only one screen currently uses it.

The Model determines the semantic result. The UI remains free to decide how
that result looks: a tick, cross, colour, animation, alert, or inline message.

