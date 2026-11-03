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
