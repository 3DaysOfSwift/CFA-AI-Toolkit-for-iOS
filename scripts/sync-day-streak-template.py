#!/usr/bin/env python3
"""Generate the native Xcode template from the buildable Day Streak project.

Edit the project, not its generated template. --check detects stale output.
"""
import argparse
import json
import plistlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "starter-apps/Todays Twenty"
DEST = ROOT / "templates/Xcode/Project Templates/iOS/Application/Day Streak.xctemplate"
TEST_DEST = DEST.parent / "Day Streak Tests.xctemplate"
NAME = "TimesThirty"
TOKEN = "___PACKAGENAMEASIDENTIFIER___"


def generated_files():
    outputs = {}
    definitions = {}
    nodes = []
    test_outputs = {}
    test_definitions = {}
    test_nodes = []
    for folder, source_folder, target in [
        (NAME, "Application", "com.apple.dt.applicationTarget"),
        (NAME + "Tests", "Tests", "com.3daysofswift.cfa.dayStreakTests"),
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
            if source_folder == "Tests":
                source = f"Source/{relative}"
                test_outputs[source] = file.read_text().replace(NAME, "___PROJECTNAME:identifier___").encode()
                test_definitions[relative] = {"Path": source}
                test_nodes.append(relative)
                continue
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
    shared = {"SWIFT_VERSION": "6.0", "IPHONEOS_DEPLOYMENT_TARGET": "18.0", "GENERATE_INFOPLIST_FILE": "YES", "SWIFT_STRICT_CONCURRENCY": "complete", "SWIFT_DEFAULT_ACTOR_ISOLATION": "nonisolated", "MARKETING_VERSION": "1.0", "CURRENT_PROJECT_VERSION": "1"}
    info = {
        "Kind": "Xcode.Xcode3.ProjectTemplateUnitKind",
        "Identifier": "com.3daysofswift.cfa.dayStreak",
        "Ancestors": ["com.apple.dt.unit.cocoaTouchApplicationBase"],
        "Concrete": True,
        "Description": "CFA Day Streak: multiplication practice, daily limits, a reusable streak feature, seven themes, lazy SwiftData and focused tests.",
        "Platforms": ["com.apple.platform.iphoneos"],
        "NameOfInitialFileForEditor": "___PACKAGENAMEASIDENTIFIER___App.swift",
        "Definitions": definitions,
        "Nodes": nodes,
        "Options": [
            {"Identifier": "appLifecycle", "Default": "SwiftUI", "Type": "popup", "Values": ["SwiftUI"], "RequiredOptionsForValues": {"SwiftUI": {"userInterface": "SwiftUI"}}},
            {"Identifier": "languageChoice", "Default": "Swift", "Type": "popup", "Values": ["Swift"]},
            {"Identifier": "testingSystem", "Override": "None"},
            {"Identifier": "cfaDayTests", "Name": "CFA Unit Tests:", "Type": "popup", "Values": ["Include"], "Default": "Include", "Units": {"Include": {"Components": [{"Identifier": "com.3daysofswift.cfa.day-unit-tests", "Name": "___PACKAGENAME___Tests"}]}}},
        ],
        "Targets": [
            {"TargetIdentifier": "com.apple.dt.applicationTarget", "SharedSettings": {**shared, "INFOPLIST_KEY_UISupportedInterfaceOrientations": "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight", "INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad": "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight UIInterfaceOrientationPortraitUpsideDown", "ENABLE_TESTABILITY": "YES", "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon", "INFOPLIST_KEY_CFBundleDisplayName": "$(PRODUCT_NAME)", "INFOPLIST_KEY_UIApplicationSceneManifest_Generation": "YES", "INFOPLIST_KEY_UILaunchStoryboardName": "LaunchScreen"}},
        ],
    }
    outputs["TemplateInfo.plist"] = plistlib.dumps(info, sort_keys=False)
    outputs["CFA-TEMPLATE.json"] = (json.dumps({"product": "cooperative-feature-architecture", "template": "Day Streak", "version": 1}, indent=2) + "\n").encode()
    test_info = {"Kind": "Xcode.Xcode3.ProjectTemplateUnitKind", "Identifier": "com.3daysofswift.cfa.day-unit-tests", "Concrete": False, "Ancestors": ["com.apple.dt.unit.unitTestBundleBase.app.SwiftUI", "com.apple.dt.unit.multiPlatform.base"], "Nodes": test_nodes, "Definitions": test_definitions, "Targets": [{"TargetIdentifier": "com.apple.dt.applicationUnitTestBundleTarget", "TargetIdentifierToBeTested": "com.apple.dt.applicationTarget", "SharedSettings": {"SWIFT_VERSION": "6.0", "IPHONEOS_DEPLOYMENT_TARGET": "18.0", "SWIFT_STRICT_CONCURRENCY": "complete", "SWIFT_DEFAULT_ACTOR_ISOLATION": "nonisolated", "PRODUCT_BUNDLE_IDENTIFIER": "___VARIABLE_bundleIdentifierPrefix___.___PROJECTNAME:identifier___.___PACKAGENAME:identifier___"}}]}
    test_outputs["TemplateInfo.plist"] = plistlib.dumps(test_info, sort_keys=False)
    test_outputs["CFA-TEMPLATE.json"] = (json.dumps({"product": "cooperative-feature-architecture", "template": "Day Streak Tests", "version": 1}, indent=2) + "\n").encode()
    return {DEST: outputs, TEST_DEST: test_outputs}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    groups = generated_files()
    for destination, outputs in groups.items():
        existing = {f.relative_to(destination).as_posix() for f in destination.rglob("*") if f.is_file() and not f.name.startswith(".")}
        unexpected = existing - outputs.keys()
        if unexpected:
            raise SystemExit(f"Unexpected template files (review manually): {sorted(unexpected)}")
        for relative, content in outputs.items():
            file = destination / relative
            if args.check:
                if not file.exists() or file.read_bytes() != content:
                    raise SystemExit(f"Stale Day Streak template: {relative}. Run python3 scripts/sync-day-streak-template.py")
            else:
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(content)
    print(f"Day Streak templates {'verified' if args.check else 'synchronised'} ({sum(map(len, groups.values()))} files).")


if __name__ == "__main__":
    main()
