import Foundation
import SwiftParser
import SwiftSyntax

struct Item: Codable {
    let kind: String
    let name: String
    let file: String
    let line: Int
    let column: Int
    let enclosingFunction: String?
    let lexicalTaskParent: String?
}

struct Inventory: Codable {
    let files: [String]
    let items: [Item]
    let warnings: [String]
}

final class SourceInventory: SyntaxVisitor {
    private let file: String
    private let converter: SourceLocationConverter
    private(set) var items: [Item] = []
    private var functions: [String] = []
    private var tasks: [String] = []

    init(file: String, tree: SourceFileSyntax) {
        self.file = file
        self.converter = SourceLocationConverter(fileName: file, tree: tree)
        super.init(viewMode: .sourceAccurate)
    }

    private func record(_ kind: String, _ name: String, _ node: some SyntaxProtocol) {
        let location = converter.location(for: node.positionAfterSkippingLeadingTrivia)
        items.append(Item(kind: kind, name: name, file: file, line: location.line, column: location.column,
                          enclosingFunction: functions.last, lexicalTaskParent: tasks.last))
    }

    override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type.struct", node.name.text, node)
        if node.attributes.trimmedDescription.contains("@main") { record("entry.main", node.name.text, node) }
        return .visitChildren
    }
    override func visit(_ node: ClassDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type.class", node.name.text, node)
        if node.attributes.trimmedDescription.contains("@main") { record("entry.main", node.name.text, node) }
        return .visitChildren
    }
    override func visit(_ node: ActorDeclSyntax) -> SyntaxVisitorContinueKind { record("type.actor", node.name.text, node); return .visitChildren }
    override func visit(_ node: EnumDeclSyntax) -> SyntaxVisitorContinueKind { record("type.enum", node.name.text, node); return .visitChildren }
    override func visit(_ node: ProtocolDeclSyntax) -> SyntaxVisitorContinueKind { record("type.protocol", node.name.text, node); return .visitChildren }
    override func visit(_ node: ExtensionDeclSyntax) -> SyntaxVisitorContinueKind { record("type.extension", node.extendedType.trimmedDescription, node); return .visitChildren }
    override func visit(_ node: FunctionDeclSyntax) -> SyntaxVisitorContinueKind {
        record("function", node.name.text, node)
        if node.name.text == "application" && node.signature.parameterClause.trimmedDescription.contains("didFinishLaunchingWithOptions") {
            record("entry.launchCallback", node.name.text, node)
        }
        functions.append(node.name.text)
        return .visitChildren
    }
    override func visitPost(_ node: FunctionDeclSyntax) { functions.removeLast() }
    override func visit(_ node: InitializerDeclSyntax) -> SyntaxVisitorContinueKind { record("initializer", "init", node); functions.append("init"); return .visitChildren }
    override func visitPost(_ node: InitializerDeclSyntax) { functions.removeLast() }
    override func visit(_ node: AwaitExprSyntax) -> SyntaxVisitorContinueKind { record("concurrency.await", "await", node); return .visitChildren }
    override func visit(_ node: FunctionCallExprSyntax) -> SyntaxVisitorContinueKind {
        let called = node.calledExpression.trimmedDescription
        // A written call is a candidate, not a resolved callee or proof of execution.
        record("call.expression", called, node)
        switch called {
        case "Task", "Task.init": record("concurrency.task", called, node); tasks.append(taskLocation(node))
        case "Task.detached": record("concurrency.detached", called, node); tasks.append(taskLocation(node))
        case "withTaskGroup", "withThrowingTaskGroup", "withDiscardingTaskGroup", "withThrowingDiscardingTaskGroup":
            record("concurrency.taskGroup", called, node)
        case "Button", "SwiftUI.Button": record("entry.button", called, node)
        default:
            if let member = node.calledExpression.as(MemberAccessExprSyntax.self) {
                let name = member.declName.baseName.text
                if name == "addTask" || name == "addTaskUnlessCancelled" { record("concurrency.groupChild", name, member.declName) }
                if name == "task" { record("entry.viewTask", name, member.declName) }
                if name == "refreshable" { record("entry.refreshable", name, member.declName) }
            }
        }
        return .visitChildren
    }
    override func visitPost(_ node: FunctionCallExprSyntax) {
        if ["Task", "Task.init", "Task.detached"].contains(node.calledExpression.trimmedDescription) { tasks.removeLast() }
    }
    private func taskLocation(_ node: FunctionCallExprSyntax) -> String {
        let location = converter.location(for: node.positionAfterSkippingLeadingTrivia)
        return "\(file):\(location.line):\(location.column)"
    }
}

func swiftFiles(in root: URL) throws -> [URL] {
    let excluded: Set<String> = [".git", ".build", ".swiftpm", "Pods", "Carthage", "node_modules", "DerivedData", "build", "reports"]
    guard let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles]) else {
        throw NSError(domain: "Inventory", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot enumerate project directory"])
    }
    var files: [URL] = []
    for case let url as URL in enumerator {
        let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
        if values.isSymbolicLink == true { if values.isDirectory == true { enumerator.skipDescendants() }; continue }
        if values.isDirectory == true {
            let name = url.lastPathComponent.lowercased()
            if excluded.contains(url.lastPathComponent) || name.hasSuffix("test") || name.hasSuffix("tests") { enumerator.skipDescendants() }
        } else if url.pathExtension == "swift" { files.append(url) }
    }
    return files.sorted { $0.path < $1.path }
}

do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "Inventory", code: 2, userInfo: [NSLocalizedDescriptionKey: "Usage: swift-syntax-inventory <project-directory>"]) }
    let root = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL.resolvingSymlinksInPath()
    let files = try swiftFiles(in: root)
    guard !files.isEmpty else { throw NSError(domain: "Inventory", code: 3, userInfo: [NSLocalizedDescriptionKey: "No Swift files found"]) }
    var items: [Item] = []
    var names: [String] = []
    var warnings: [String] = []
    for url in files {
        let resolved = url.resolvingSymlinksInPath()
        guard resolved.path.hasPrefix(root.path + "/") else {
            throw NSError(domain: "Inventory", code: 4, userInfo: [NSLocalizedDescriptionKey: "Source file is outside the project directory"])
        }
        let relative = String(resolved.path.dropFirst(root.path.count + 1))
        names.append(relative)
        let source = try String(contentsOf: url, encoding: .utf8)
        let tree = Parser.parse(source: source)
        if tree.hasError { warnings.append("Parser reported errors in \(relative)") }
        let visitor = SourceInventory(file: relative, tree: tree)
        visitor.walk(tree)
        items.append(contentsOf: visitor.items)
    }
    let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    FileHandle.standardOutput.write(try encoder.encode(Inventory(files: names, items: items, warnings: warnings)))
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
    exit(1)
}
