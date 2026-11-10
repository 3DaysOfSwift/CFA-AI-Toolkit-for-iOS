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

    override func visit(_ node: SourceFileSyntax) -> SyntaxVisitorContinueKind {
        if file.split(separator: "/").last == "main.swift" {
            _ = recordTopLevelStartup(in: node.statements)
        }
        return .visitChildren
    }

    private func recordTopLevelStartup(in statements: CodeBlockItemListSyntax) -> Bool {
        for statement in statements {
            if let conditional = statement.item.as(IfConfigDeclSyntax.self) {
                // The source inventory does not select a build configuration.
                var coversEveryBranch = conditional.clauses.last?.poundKeyword.text == "#else"
                for clause in conditional.clauses {
                    let branch = clause.elements?.as(CodeBlockItemListSyntax.self)
                    if branch.map({ recordTopLevelStartup(in: $0) }) != true {
                        coversEveryBranch = false
                    }
                }
                if coversEveryBranch { return true }
            } else if let variable = statement.item.as(VariableDeclSyntax.self),
                      let initializer = variable.bindings.compactMap(\.initializer).first {
                record("entry.main", "main.swift", initializer.value)
                return true
            } else if statement.item.as(DeclSyntax.self) == nil {
                record("entry.main", "main.swift", statement)
                return true
            }
        }
        return false
    }

    private func recordMain(_ name: String, _ node: some SyntaxProtocol, attributes: AttributeListSyntax) {
        if attributes.contains(where: { $0.as(AttributeSyntax.self)?.attributeName.trimmedDescription == "main" }) {
            record("entry.main", name, node)
        }
    }

    override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type.struct", node.name.text, node)
        recordMain(node.name.text, node, attributes: node.attributes)
        return .visitChildren
    }
    override func visit(_ node: ClassDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type.class", node.name.text, node)
        recordMain(node.name.text, node, attributes: node.attributes)
        return .visitChildren
    }
    override func visit(_ node: ActorDeclSyntax) -> SyntaxVisitorContinueKind { record("type.actor", node.name.text, node); return .visitChildren }
    override func visit(_ node: EnumDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type.enum", node.name.text, node)
        recordMain(node.name.text, node, attributes: node.attributes)
        return .visitChildren
    }
    override func visit(_ node: ProtocolDeclSyntax) -> SyntaxVisitorContinueKind { record("type.protocol", node.name.text, node); return .visitChildren }
    override func visit(_ node: ExtensionDeclSyntax) -> SyntaxVisitorContinueKind { record("type.extension", node.extendedType.trimmedDescription, node); return .visitChildren }
    override func visit(_ node: FunctionDeclSyntax) -> SyntaxVisitorContinueKind {
        record("function", node.name.text, node)
        if node.name.text == "application" && node.signature.parameterClause.parameters.dropFirst().first?.firstName.text == "didFinishLaunchingWithOptions" {
            record("entry.launchCallback", node.name.text, node.funcKeyword)
        }
        if node.name.text == "userNotificationCenter",
           node.signature.parameterClause.parameters.contains(where: {
               $0.firstName.text == "didReceive" &&
                   ["UNNotificationResponse", "UserNotifications.UNNotificationResponse"].contains($0.type.trimmedDescription)
           }) {
            record("entry.notificationResponse", node.name.text, node)
        }
        let labels = node.signature.parameterClause.parameters.map { $0.firstName.text }
        switch (node.name.text, labels) {
        case ("application", ["_", "open", "options"]),
             ("application", ["_", "continue", "restorationHandler"]),
             ("scene", ["_", "openURLContexts"]),
             ("scene", ["_", "continue"]):
            record("entry.incomingLink", node.name.text, node)
        default:
            break
        }
        functions.append(node.name.text)
        return .visitChildren
    }
    override func visitPost(_ node: FunctionDeclSyntax) { functions.removeLast() }
    override func visit(_ node: InitializerDeclSyntax) -> SyntaxVisitorContinueKind { record("initializer", "init", node); functions.append("init"); return .visitChildren }
    override func visitPost(_ node: InitializerDeclSyntax) { functions.removeLast() }
    override func visit(_ node: VariableDeclSyntax) -> SyntaxVisitorContinueKind {
        if node.bindingSpecifier.tokenKind == .keyword(.let),
           let modifier = node.modifiers.first(where: { $0.name.tokenKind == .keyword(.async) }) {
            record("concurrency.asyncLet", "async let", modifier)
        }
        return .visitChildren
    }
    override func visit(_ node: AwaitExprSyntax) -> SyntaxVisitorContinueKind { record("concurrency.await", "await", node); return .visitChildren }
    override func visit(_ node: FunctionCallExprSyntax) -> SyntaxVisitorContinueKind {
        let called = node.calledExpression.trimmedDescription
        // A written call is a candidate, not a resolved callee or proof of execution.
        record("call.expression", called, node)
        switch taskSpelling(node.calledExpression) {
        case "Task", "Task.init": record("concurrency.task", called, node); tasks.append(taskLocation(node))
        case "Task.detached": record("concurrency.detached", called, node); tasks.append(taskLocation(node))
        case "withTaskGroup", "withThrowingTaskGroup", "withDiscardingTaskGroup", "withThrowingDiscardingTaskGroup":
            record("concurrency.taskGroup", called, node)
        case "Button", "SwiftUI.Button": record("entry.button", called, node)
        case "BGTaskScheduler.shared.register", "BackgroundTasks.BGTaskScheduler.shared.register":
            record("entry.backgroundHandler", called, node)
        default:
            if let member = node.calledExpression.as(MemberAccessExprSyntax.self) {
                let name = member.declName.baseName.text
                if name == "addTask" || name == "addTaskUnlessCancelled" { record("concurrency.groupChild", name, member.declName) }
                if name == "task" { record("entry.viewTask", name, member.declName) }
                if name == "refreshable" { record("entry.refreshable", name, member.declName) }
                if name == "onOpenURL" || name == "onContinueUserActivity" {
                    record("entry.incomingLink", name, member.declName)
                }
            }
        }
        return .visitChildren
    }
    override func visitPost(_ node: FunctionCallExprSyntax) {
        if ["Task", "Task.init", "Task.detached"].contains(taskSpelling(node.calledExpression)) { tasks.removeLast() }
    }

    private func taskSpelling(_ expression: ExprSyntax) -> String {
        if let specialization = expression.as(GenericSpecializationExprSyntax.self) {
            return taskSpelling(specialization.expression)
        }
        if let member = expression.as(MemberAccessExprSyntax.self), let base = member.base {
            let name = member.declName.baseName.text
            if name == "Task", let module = base.as(DeclReferenceExprSyntax.self),
               ["Swift", "_Concurrency"].contains(module.baseName.text) {
                return "Task"
            }
            if taskSpelling(base) == "Task" {
                return "Task." + name
            }
        }
        return expression.trimmedDescription
    }
    private func taskLocation(_ node: FunctionCallExprSyntax) -> String {
        let location = converter.location(for: node.positionAfterSkippingLeadingTrivia)
        return "\(file):\(location.line):\(location.column)"
    }
}

func swiftFiles(in root: URL, includeTests: Bool) throws -> [URL] {
    let excluded: Set<String> = [".git", ".build", ".swiftpm", "Pods", "Carthage", "node_modules", "DerivedData", "build"]
    guard let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles]) else {
        throw NSError(domain: "Inventory", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot enumerate project directory"])
    }
    var files: [URL] = []
    for case let url as URL in enumerator {
        let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
        if values.isSymbolicLink == true { if values.isDirectory == true { enumerator.skipDescendants() }; continue }
        if values.isDirectory == true {
            let name = url.lastPathComponent
            let testDirectory = name == "test" || name == "tests" || name.hasSuffix("Test") || name.hasSuffix("Tests")
            if excluded.contains(name) || (!includeTests && testDirectory) { enumerator.skipDescendants() }
        } else if url.pathExtension == "swift" { files.append(url) }
    }
    return files.sorted { $0.path < $1.path }
}

do {
    let includeTests = CommandLine.arguments.dropFirst(2).first == "--include-tests"
    guard CommandLine.arguments.count == (includeTests ? 3 : 2) else { throw NSError(domain: "Inventory", code: 2, userInfo: [NSLocalizedDescriptionKey: "Usage: swift-syntax-inventory <project-directory>"]) }
    let root = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL.resolvingSymlinksInPath()
    let files = try swiftFiles(in: root, includeTests: includeTests)
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
        guard let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize else {
            warnings.append("Could not determine the source size of \(relative)")
            continue
        }
        // Match the lexical inventory's source size limit.
        guard size <= 2_000_000 else {
            warnings.append("Over 2 MB source limit: \(relative)")
            continue
        }
        guard let source = try? String(contentsOf: url, encoding: .utf8),
              !source.utf8.contains(0) else {
            warnings.append("Could not read \(relative) as UTF-8 Swift source")
            continue
        }
        names.append(relative)
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
