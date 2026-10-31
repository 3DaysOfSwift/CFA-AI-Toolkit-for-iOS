# SwiftSyntax inventory prototype

This read-only experiment uses the SwiftSyntax and SwiftParser libraries bundled
with the selected Xcode toolchain. It inventories Swift source declarations,
initializers, awaits, task creation syntax and selected event candidates.

```sh
./tools/swift-syntax-prototype/run.sh /path/to/project > /tmp/swift-inventory.json
node --test tools/swift-syntax-prototype/test.mjs
```

Requires macOS, Xcode with SwiftSyntax host libraries, and Node.js for the test.
The script compiles a temporary executable, removes it on exit, and does not
modify the inspected project. It excludes common dependency/build folders and
directories whose names end in `Tests`. The output contains file paths and symbol
names and should be reviewed before sharing.

This is an experiment, not the Health Check's production scanner. It does not
resolve Xcode target membership, type-check symbols, evaluate conditional
compilation, establish which overload a call reaches, or infer task ownership,
actor isolation, runtime execution or correctness. A call named `Task` or
`Button` is a candidate until verified semantically. It does not discover every
possible entry point. Parser errors are listed as warnings, and the corresponding
file's extracted declarations may be incomplete. SwiftSyntax library availability
and compatibility vary with the selected Xcode version.
