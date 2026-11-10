#!/usr/bin/env python3
"""Build reproducible source and plugin ZIPs. No third-party Python modules required."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
EXCLUSIONS = json.loads((ROOT / 'scripts/release-exclusions.json').read_text())
SOURCE_PARTS = ['.codex-plugin', '.github', 'readme-images', 'architecture', 'skills', 'tools', 'scripts', 'test', 'evals', 'examples', 'templates', 'starter-apps', 'docs',
                'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'AGENTS.md', '.gitignore', 'Install.command', 'Install Xcode Template.command', 'package.json', 'plugin.json']

def is_release_path(relative):
    return (not any(part in EXCLUSIONS['directoryNames'] for part in relative.parts)
            and relative.name not in EXCLUSIONS['fileNames']
            and not any(relative.name.endswith(suffix) for suffix in EXCLUSIONS['fileSuffixes']))

def untracked_release_files(root, allowed=SOURCE_PARTS):
    """Return untracked, non-ignored files that a checkout release would package."""
    if not (root / '.git').exists():
        return []
    result = subprocess.run(
        ['git', 'ls-files', '--others', '--exclude-standard', '-z'],
        cwd=root, check=True, stdout=subprocess.PIPE)
    allowed_roots = set(allowed)
    paths = (Path(value.decode()) for value in result.stdout.split(b'\0') if value)
    return sorted(relative.as_posix() for relative in paths
                  if relative.parts and relative.parts[0] in allowed_roots
                  and is_release_path(relative))

def archive(output, pairs, prefix):
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for relative, source in sorted(pairs):
            if source.is_symlink():
                raise ValueError(f'Symlinks are not distributable: {source}')
            entry = zipfile.ZipInfo(prefix + '/' + relative, (1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            # Preserve intentional executable entry points regardless of their
            # extension. In particular, the dashboard's package.json exposes
            # src/cli.mjs as a bin, so reducing every .mjs file to 0644 breaks
            # the declared command after extraction.
            mode = 0o755 if source.stat().st_mode & 0o111 else 0o644
            entry.external_attr = (0o100000 | mode) << 16
            z.writestr(entry, source.read_bytes())

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'dist')
    parser.add_argument('--node', default=shutil.which('node'))
    args = parser.parse_args()
    if not args.node:
        parser.error('Node.js 20+ is required; install it or supply --node /path/to/node.')
    out = args.out.resolve()
    if out.exists():
        parser.error('Output already exists; choose a new --out directory.')
    untracked = untracked_release_files(ROOT)
    if untracked:
        parser.error('Release-eligible untracked files must be reviewed, added or ignored first: '
                     + ', '.join(untracked))
    run = lambda *command: subprocess.run(command, cwd=ROOT, check=True)
    run(args.node, 'scripts/sync.mjs')
    run(args.node, 'scripts/validate.mjs')
    tests = (sorted(ROOT.glob('test/*.test.mjs'))
             + sorted(ROOT.glob('tools/architecture-dashboard/test/*.test.mjs'))
             + [ROOT / 'tools/swift-syntax-prototype/test.mjs'])
    run(args.node, '--test', *(str(test) for test in tests))
    manifest = json.loads((ROOT / '.codex-plugin/plugin.json').read_text())
    name, version = manifest['name'], manifest['version']
    package = out / name
    run(args.node, 'scripts/build.mjs', str(package))
    plugin_zip = out / f'{name}-{version}-plugin.zip'
    archive(plugin_zip, [(p.relative_to(package).as_posix(), p) for p in package.rglob('*') if p.is_file()], name)
    sources = []
    for part in SOURCE_PARTS:
        path = ROOT / part
        if not path.exists():
            continue
        for p in ([path] if path.is_file() else path.rglob('*')):
            if p.is_file() and is_release_path(p.relative_to(ROOT)):
                sources.append((p.relative_to(ROOT).as_posix(), p))
    source_zip = out / f'{name}-{version}-source.zip'
    archive(source_zip, sources, name)
    (out / 'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [plugin_zip, source_zip]))
    print(f'Release ready: {out}')

if __name__ == '__main__':
    main()
