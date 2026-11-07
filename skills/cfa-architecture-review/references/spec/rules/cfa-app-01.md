# CFA-SPEC-APP-01: Compose the application model once per process

**Applies when:** Composing a CFA app or target.

**Strength:** Required.

**Guidance:** AppModel constructs and exposes concrete Features through an explicit graph and contains no UI navigation or Feature business rules.

**Why:** The Model has one visible entry point within each process.

**Example:** AppModel.live() constructs NotesFeature and its storage dependency for the application graph.

**Open-source code:** [Personal API](https://github.com/3DaysOfSwift/Personal-API-iOS-App-Swift-Concurrency-CFA/blob/b737865cedea92d3d85c2b8c0fd3eb7274dcc2a4/PersonalAPI/2%20-%20AppModel/AppModel.swift) · [Amigos](https://github.com/3DaysOfSwift/Amigos/blob/96a3878f6218b9d3e811309eb8469f845d3df6f2/Amigos/2%20-%20AppModel/AppModel.swift) · [123 Calc](https://github.com/3DaysOfSwift/123-Calc/blob/edebdcc9495dbe5d75088d161274499bfbfbfb3c/123%20Calc/2%20-%20AppModel/AppModel.swift) · [Phone Drive](https://github.com/3DaysOfSwift/Phone-Drive/blob/81854fb55bfdbd62381d79c579856fa0f1a5af98/Phone%20Drive/2%20-%20AppModel/AppModel.swift). Inspect the specific behaviour; these projects may also contain older conventions.

**Explanation:** [Why use AppModel in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/appmodel-composition).

**Verify:** Review live composition, initializer dependencies and isolated test graphs.

**Full rule, context and examples:** [Use AppModel as the Composition Root and Feature Facade](../topics/17-use-appmodel-as-the-composition-root-and-feature-facade.md). This card is a reading aid; apply the complete canonical section.
