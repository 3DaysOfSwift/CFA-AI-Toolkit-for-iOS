#!/usr/bin/env python3
"""Generate the native Xcode template from the buildable Habit Tracker project.

Edit the project, not its generated template. --check detects stale output.
"""
import argparse
import json
import plistlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "templates/Xcode/Habit Tracker iOS"
DEST = ROOT / "templates/Xcode/Project Templates/iOS/Application/Habit Tracker.xctemplate"
NAME = "HabitTrackerTemplate"
TOKEN = "___PACKAGENAMEASIDENTIFIER___"


def generated_files():
    outputs = {}
    definitions = {}
    nodes = []
    for folder, source_folder, target in [
        (NAME, "Application", "com.apple.dt.applicationTarget"),
        (NAME + "Tests", "Tests", "com.3daysofswift.cfa.habitTrackerTests"),
    ]:
        for file in sorted((PROJECT / folder).rglob("*")):
            if not file.is_file():
                continue
            relative = file.relative_to(PROJECT / folder).as_posix()
            if any(part.startswith(".") for part in file.relative_to(PROJECT / folder).parts):
                continue
            if relative.startswith("Assets.xcassets/"):
                outputs["Source/Assets.xcassets/" + relative.removeprefix("Assets.xcassets/")] = file.read_bytes()
                continue
            if relative == "1 - View/App.swift":
                relative = "1 - View/___PACKAGENAMEASIDENTIFIER___App.swift"
            source = f"Source/{source_folder}/{relative}"
            outputs[source] = file.read_text().replace(NAME, TOKEN).encode()
            node = relative if source_folder == "Application" else f"{TOKEN}Tests/{relative}"
            definition = {"Path": source, "TargetIdentifiers": [target]}
            if relative.startswith("1 - View/___"):
                definition["Group"] = "1 - View"
            elif relative.startswith("3 - App Resources/"):
                definition["Group"] = "3 - App Resources"
            definitions[node] = definition
            nodes.append(node)
    definitions["Assets.xcassets"] = {"Path": "Source/Assets.xcassets", "TargetIdentifiers": ["com.apple.dt.applicationTarget"]}
    nodes.append("Assets.xcassets")
    shared = {"SWIFT_VERSION": "6.0", "IPHONEOS_DEPLOYMENT_TARGET": "18.0", "GENERATE_INFOPLIST_FILE": "YES", "SWIFT_STRICT_CONCURRENCY": "complete"}
    info = {
        "Kind": "Xcode.Xcode3.ProjectTemplateUnitKind",
        "Identifier": "com.3daysofswift.cfa.habitTracker",
        "Ancestors": ["com.apple.dt.unit.cocoaTouchApplicationBase"],
        "Concrete": True,
        "Description": "CFA Habit Tracker: Today, Habits, Settings, lazy SwiftData persistence, themes and focused Swift Testing suites.",
        "Platforms": ["com.apple.platform.iphoneos"],
        "NameOfInitialFileForEditor": "___PACKAGENAMEASIDENTIFIER___App.swift",
        "Definitions": definitions,
        "Nodes": nodes,
        "Options": [
            {"Identifier": "appLifecycle", "Default": "SwiftUI", "Type": "popup", "Values": ["SwiftUI"], "RequiredOptionsForValues": {"SwiftUI": {"userInterface": "SwiftUI"}}},
            {"Identifier": "languageChoice", "Default": "Swift", "Type": "popup", "Values": ["Swift"]},
        ],
        "Targets": [
            {"TargetIdentifier": "com.apple.dt.applicationTarget", "SharedSettings": {**shared, "ENABLE_TESTABILITY": "YES", "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon", "INFOPLIST_KEY_UIApplicationSceneManifest_Generation": "YES", "INFOPLIST_KEY_UILaunchStoryboardName": "LaunchScreen"}},
            {"TargetIdentifier": "com.3daysofswift.cfa.habitTrackerTests", "TargetIdentifierToBeTested": "com.apple.dt.applicationTarget", "Name": TOKEN + "Tests", "ProductType": "com.apple.product-type.bundle.unit-test", "SharedSettings": {**shared, "PRODUCT_NAME": "$(TARGET_NAME)", "PRODUCT_BUNDLE_IDENTIFIER": "___ORGANIZATIONIDENTIFIER___." + TOKEN + "." + TOKEN + "Tests", "BUNDLE_LOADER": "$(TEST_HOST)", "TEST_HOST": "$(BUILT_PRODUCTS_DIR)/" + TOKEN + ".app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/" + TOKEN}, "Configurations": {"Debug": {}, "Release": {}}, "BuildPhases": [{"Class": phase} for phase in ["Sources", "Frameworks", "Resources"]]},
        ],
    }
    outputs["TemplateInfo.plist"] = plistlib.dumps(info, sort_keys=False)
    outputs["CFA-TEMPLATE.json"] = (json.dumps({"product": "cooperative-feature-architecture", "template": "Habit Tracker", "version": 1}, indent=2) + "\n").encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = generated_files()
    existing = {f.relative_to(DEST).as_posix() for f in DEST.rglob("*") if f.is_file() and not f.name.startswith(".")}
    unexpected = existing - outputs.keys()
    if unexpected:
        raise SystemExit(f"Unexpected template files (review manually): {sorted(unexpected)}")
    for relative, content in outputs.items():
        file = DEST / relative
        if args.check:
            if not file.exists() or file.read_bytes() != content:
                raise SystemExit(f"Stale Habit Tracker template: {relative}. Run python3 scripts/sync-habit-template.py")
        else:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(content)
    print(f"Habit Tracker template {'verified' if args.check else 'synchronised'} ({len(outputs)} files).")


if __name__ == "__main__":
    main()
