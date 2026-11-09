import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

// Syntax is evidence of structure, not a resolved call graph or task parentage.
export async function collectSyntax(root, {includeTests = false} = {}) {
  if (process.platform !== 'darwin') return {status:'unavailable', reason:'SwiftSyntax inventory requires macOS and Xcode.'};
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'cfa-syntax-'));
  try {
    const compiler = (await run('xcrun', ['--find', 'swiftc'])).stdout.trim();
    const host = path.resolve(path.dirname(compiler), '../lib/swift/host');
    const executable = path.join(temporary,'inventory');
    await run('xcrun',['swiftc','-module-cache-path',path.join(temporary,'cache'),'-I',host,'-L',host,'-Xlinker','-rpath','-Xlinker',host,path.join(here,'syntax-inventory.swift'),'-o',executable],{timeout:120000,maxBuffer:1024*1024});
    const result = await run(executable,includeTests ? [root,'--include-tests'] : [root],{timeout:120000,maxBuffer:100*1024*1024});
    const inventory=JSON.parse(result.stdout);
    if (!Array.isArray(inventory.files) || !Array.isArray(inventory.items) || !Array.isArray(inventory.warnings)) throw Error('Unexpected SwiftSyntax inventory format.');
    return {status:'available',...inventory};
  } catch (error) {
    return {status:'unavailable',reason:`SwiftSyntax inventory could not run: ${String(error.stderr || error.message).trim().slice(0,500)}`};
  } finally { await fs.rm(temporary,{recursive:true,force:true}); }
}
