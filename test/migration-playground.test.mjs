import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examples = ['Serial Weight Saves', 'Callback Networking', 'MainActor Result', 'Observation Migration'];
for (const name of examples) for (const [side, version] of [['Before','5'], ['After','6']]) {
  const folder = path.join(root, 'examples/migration', name, `${side}.playground`);
  const marker = `// MARK: - Run ${side.toLowerCase()} example`;
  test(`${name}: ${side} declares Swift ${version} and has a run section`, () => {
    const page = fs.readFileSync(path.join(folder, 'Contents.swift'), 'utf8');
    assert.match(fs.readFileSync(path.join(folder, 'contents.xcplayground'), 'utf8'), new RegExp(`swift-version=["']${version}["']`));
    assert.ok(fs.existsSync(path.join(root, 'examples/migration', name, 'case.md')));
    assert.equal(page.split(marker).length, 2);
  });
  test(`${name}: ${side} runs its Swift ${version} behaviour check`, {skip:process.platform !== 'darwin', timeout:120000}, () => {
    const page = fs.readFileSync(path.join(folder, 'Contents.swift'), 'utf8');
    const source = page.split(marker)[0].replace('import PlaygroundSupport\n', '').replace('PlaygroundPage.current.needsIndefiniteExecution = true\n', '');
    const harness = `\n@main struct Runner { @MainActor static func main() async throws { ${name === 'Callback Networking' ? 'try await' : name === 'Observation Migration' ? '' : 'await'} runExample() } }\n`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-migration-'));
    try {
      const input = path.join(dir, 'Example.swift'); fs.writeFileSync(input, source + harness);
      const executable = path.join(dir, 'example');
      const build = spawnSync('xcrun',['swiftc','-parse-as-library','-swift-version',version,'-module-cache-path',path.join(dir,'cache'),input,'-o',executable],{encoding:'utf8',timeout:90000});
      assert.equal(build.status,0,build.stderr || build.error?.message);
      const run = spawnSync(executable,[],{encoding:'utf8',timeout:15000});
      assert.equal(run.status,0,run.stderr || run.error?.message);
      assert.match(run.stdout,/Passed:/);
    } finally { fs.rmSync(dir,{recursive:true,force:true}); }
  });
}

test('MainActor Result returns queued outcomes even when a refresh caller cancels', {skip:process.platform !== 'darwin', timeout:120000}, () => {
  const page = fs.readFileSync(path.join(root, 'examples/migration/MainActor Result/After.playground/Contents.swift'), 'utf8');
  const feature = page.slice(page.indexOf('protocol LaunchProviding'), page.indexOf('// MARK: - Test fixtures'));
  assert.match(feature, /final class LaunchFeature/);
  // Replace only the I/O fixture: the Feature under test is the playground's actual code.
  const source = `import Foundation
import Observation
actor ControlledLaunchProvider: LaunchProviding {
    enum Failure: Error { case unavailable }
    private var started = false
    private var startWaiter: CheckedContinuation<Void, Never>?
    private var releaseWaiter: CheckedContinuation<Void, Never>?
    private(set) var calls: [Bool] = []
    func download(available: Bool) async throws -> String {
        calls.append(available)
        if !available {
            started = true
            startWaiter?.resume()
            startWaiter = nil
            await withCheckedContinuation { releaseWaiter = $0 }
            throw Failure.unavailable
        }
        try Task.checkCancellation()
        return "Artemis"
    }
    func waitForFirst() async {
        if started { return }
        await withCheckedContinuation { startWaiter = $0 }
    }
    func releaseFirst() { releaseWaiter?.resume(); releaseWaiter = nil }
}
${feature}
extension LaunchFeature {
    // Synchronize the test with queue admission rather than sleeping.
    var testRefreshID: UUID? { refreshID }
}
@main struct Runner {
    @MainActor static func main() async {
        let provider = ControlledLaunchProvider()
        let feature = LaunchFeature(provider: provider)
        let first = Task { await feature.refresh(available: false) }
        await provider.waitForFirst()
        let firstID = feature.testRefreshID
        let second = Task { await feature.refresh(available: true) }
        while feature.testRefreshID == firstID { await Task.yield() }
        let callsBeforeRelease = await provider.calls
        precondition(callsBeforeRelease == [false])
        second.cancel()
        await provider.releaseFirst()
        let firstSucceeded = await first.value
        let secondSucceeded = await second.value
        precondition(!firstSucceeded && secondSucceeded)
        let calls = await provider.calls
        precondition(calls == [false, true])
        precondition(feature.name == "Artemis" && feature.refreshFailure == nil)
    }
}
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-refresh-'));
  try {
    const input = path.join(dir, 'Example.swift'); fs.writeFileSync(input, source);
    const executable = path.join(dir, 'example');
    const build = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(dir, 'cache'), input, '-o', executable], {encoding:'utf8', timeout:90000});
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], {encoding:'utf8', timeout:15000});
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('Serial Weight Saves preserves admitted saves across failure and caller cancellation', {skip:process.platform !== 'darwin', timeout:120000}, () => {
  const page = fs.readFileSync(path.join(root, 'examples/migration/Serial Weight Saves/After.playground/Contents.swift'), 'utf8');
  const contract = page.slice(page.indexOf('protocol WeightSaving'), page.indexOf('// Storage owns'));
  const feature = page.slice(page.indexOf('@MainActor @Observable'), page.indexOf('// MARK: - Test fixtures'));
  assert.match(feature, /func save\(_ weight: Int\) async -> Bool/);
  const source = `import Foundation
import Observation
${contract}
actor WeightStorage: WeightSaving {
    enum Failure: Error { case invalid }
    private var started = false
    private var startWaiter: CheckedContinuation<Void, Never>?
    private var releaseWaiter: CheckedContinuation<Void, Never>?
    private(set) var attempts: [Int] = []
    func save(_ weight: Int) async throws {
        attempts.append(weight)
        if !started {
            started = true
            startWaiter?.resume(); startWaiter = nil
            await withCheckedContinuation { releaseWaiter = $0 }
        }
        try Task.checkCancellation()
        if weight < 0 { throw Failure.invalid }
    }
    func waitForFirst() async {
        if started { return }
        await withCheckedContinuation { startWaiter = $0 }
    }
    func releaseFirst() { releaseWaiter?.resume(); releaseWaiter = nil }
}
${feature}
extension WeightLogFeature { var testSaveID: UUID? { lastSaveID } }
@main struct Runner {
    @MainActor static func main() async {
        let storage = WeightStorage()
        let feature = WeightLogFeature(storage: storage)
        let first = Task { await feature.save(80) }
        await storage.waitForFirst()
        let firstID = feature.testSaveID
        let invalid = Task { await feature.save(-1) }
        while feature.testSaveID == firstID { await Task.yield() }
        let secondID = feature.testSaveID
        let last = Task { await feature.save(80) }
        while feature.testSaveID == secondID { await Task.yield() }
        let before = await storage.attempts
        precondition(before == [80])
        first.cancel()
        await storage.releaseFirst()
        let a = await first.value, b = await invalid.value, c = await last.value
        let attempts = await storage.attempts
        precondition(a && !b && c && attempts == [80, -1, 80])
        precondition(feature.weights == [80, 80] && feature.saveFailure == nil)
        precondition(feature.testSaveID == nil)
    }
}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-weight-order-'));
  try {
    const input = path.join(dir, 'Example.swift'); fs.writeFileSync(input, source);
    const executable = path.join(dir, 'example');
    const build = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(dir, 'cache'), input, '-o', executable], {encoding:'utf8', timeout:90000});
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], {encoding:'utf8', timeout:15000});
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('Callback Networking starts an independent request while another is pending', {skip:process.platform !== 'darwin', timeout:120000}, () => {
  const page = fs.readFileSync(path.join(root, 'examples/migration/Callback Networking/After.playground/Contents.swift'), 'utf8');
  const implementation = page.slice(page.indexOf('struct NetworkingManager'), page.indexOf('// MARK: - Test fixtures'));
  const source = `import Foundation
${implementation}
final class ControlledTransport: URLProtocol, @unchecked Sendable {
    static let heldRequestStarted = AsyncStream<Void>.makeStream(bufferingPolicy: .bufferingNewest(1))
    static let heldRequestStopped = AsyncStream<Void>.makeStream(bufferingPolicy: .bufferingNewest(1))

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        if url.path == "/held" {
            Self.heldRequestStarted.continuation.yield(())
            return
        }
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(#"{"name":"Artemis"}"#.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {
        if request.url?.path == "/held" {
            Self.heldRequestStopped.continuation.yield(())
        }
    }
}

@main struct Runner {
    static func main() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [ControlledTransport.self]
        configuration.timeoutIntervalForRequest = 60
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }

        let api = LaunchAPI(networkingManager: NetworkingManager(session: session))
        let held = Task { try await api.download(from: URL(string: "https://example.invalid/held")!) }
        defer { held.cancel() }
        var starts = ControlledTransport.heldRequestStarted.stream.makeAsyncIterator()
        _ = await starts.next()

        let independent = try await api.download(from: URL(string: "https://example.invalid/independent")!)
        precondition(independent.name == "Artemis")

        held.cancel()
        do {
            _ = try await held.value
            preconditionFailure("The held request must finish with cancellation")
        } catch let error as URLError where error.code == .cancelled {}
        var stops = ControlledTransport.heldRequestStopped.stream.makeAsyncIterator()
        let stopped = await stops.next()
        precondition(stopped != nil)
    }
}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-network-overlap-'));
  try {
    const input = path.join(dir, 'Example.swift');
    fs.writeFileSync(input, source);
    const executable = path.join(dir, 'example');
    const build = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-swift-version', '6', '-module-cache-path', path.join(dir, 'cache'), input, '-o', executable], {encoding:'utf8', timeout:90000});
    assert.equal(build.status, 0, build.stderr || build.error?.message);
    const run = spawnSync(executable, [], {encoding:'utf8', timeout:15000});
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally {
    fs.rmSync(dir, {recursive:true, force:true});
  }
});
