## Separate Domain Decisions from Display Decisions

Features return semantic results and plain data snapshots. ViewModels
translate those results into the exact information their View needs. Views
render them.

For example:

```text
DailyTrendFeature: classifies the weight direction
TodayViewModel: exposes the classification and formatted screen values
TodayView: chooses the icon size and transition for that classification
```

A ViewModel may choose display wording or expose a presentation flag. It must
not recreate the classification rule. If another interface would need the same
answer, move the answer into the feature.

Charts receive prepared chart data. SwiftUI draws the chart, but the Model owns
filtering, ranges, projection, interpolation inputs, trend calculations, and
domain bounds. Geometry and visual scales belong to the chart View only when
they do not alter domain meaning.

