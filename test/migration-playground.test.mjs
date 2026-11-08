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
  test(`${name}: ${side} uses Swift ${version} and runs its behaviour check`, {skip:process.platform !== 'darwin', timeout:120000}, () => {
    const folder = path.join(root, 'examples/migration', name, `${side}.playground`);
    const page = fs.readFileSync(path.join(folder, 'Contents.swift'), 'utf8');
    assert.match(fs.readFileSync(path.join(folder, 'contents.xcplayground'), 'utf8'), new RegExp(`swift-version=["']${version}["']`));
    assert.ok(fs.existsSync(path.join(root, 'examples/migration', name, 'case.md')));
    const marker = `// MARK: - Run ${side.toLowerCase()} example`;
    assert.equal(page.split(marker).length, 2);
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

test('MainActor Result queues overlapping refreshes and keeps the later result', {skip:process.platform !== 'darwin', timeout:120000}, () => {
  const page = fs.readFileSync(path.join(root, 'examples/migration/MainActor Result/After.playground/Contents.swift'), 'utf8');
  const feature = page.slice(page.indexOf('// AFTER:'), page.indexOf('// MARK: - Test fixtures'));
  assert.match(feature, /final class LaunchFeature/);
  // Replace only the I/O fixture: the Feature under test is the playground's actual code.
  const source = `import Foundation
import Observation
actor LaunchProvider {
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
        let provider = LaunchProvider()
        let feature = LaunchFeature(provider: provider)
        let first = Task { await feature.refresh(available: false) }
        await provider.waitForFirst()
        let firstID = feature.testRefreshID
        let second = Task { await feature.refresh(available: true) }
        while feature.testRefreshID == firstID { await Task.yield() }
        let callsBeforeRelease = await provider.calls
        precondition(callsBeforeRelease == [false])
        await provider.releaseFirst()
        await first.value
        await second.value
        let calls = await provider.calls
        precondition(calls == [false, true])
        precondition(feature.name == "Artemis" && feature.errorMessage == nil)
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
