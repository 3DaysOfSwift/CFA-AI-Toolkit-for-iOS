import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, skills, cfaSkills } from './sync.mjs';
import { files, hash, json } from './files.mjs';
import { verifyXcodeTemplateStructure } from './verify-xcode-template-structure.mjs';
export function validate(base=root,{source=true}={}) {
  const manifest=json(path.join(base,'.codex-plugin/plugin.json'));
  if(manifest.name!=='ios-app-development-cfa') throw Error('Unexpected plugin identifier.');
  if(manifest.interface?.displayName!=='CFA AI Toolkit for iOS') throw Error('Unexpected plugin display name.');
  if(!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.version)) throw Error('Invalid release version.');
  if(manifest.license!=='MIT' || manifest.skills!=='./skills/') throw Error('Missing licence or skills path.');
  for (const field of ['logo', 'composerIcon']) {
    const relative = manifest.interface?.[field];
    if (relative !== './readme-images/CFA-Toolkit-AppIcon.png') throw Error(`CFA ${field} must use the toolkit icon.`);
    const image = fs.readFileSync(path.join(base, relative));
    if (image.length > 5_000_000 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error(`Invalid CFA ${field} PNG.`);
    const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
    if (width !== height || width < 48 || width > 4096) throw Error(`CFA ${field} must be a square image between 48 and 4096 pixels.`);
  }
  if(source) {
    const portable=json(path.join(base,'plugin.json'));
    if(portable.name!==manifest.name || portable.version!==manifest.version) throw Error('Portable plugin manifest does not match Codex manifest.');
  }
  for(const file of ['LICENSE','README.md','docs/INSTALLATION.md','docs/PRIVACY.md']) if(!fs.existsSync(path.join(base,file))) throw Error(`Missing ${file}`);
  for(const name of skills) {
    const skill=path.join(base,'skills',name);
    const text=fs.readFileSync(path.join(skill,'SKILL.md'),'utf8');
    if(!text.startsWith('---\n') || !text.includes(`name: ${name}\n`) || !/^description: .+/m.test(text)) throw Error(`Invalid skill: ${name}`);
    if(text.includes('[TODO:')) throw Error(`Unfinished skill: ${name}`);
    const guide = path.join(skill,'references/swift-coding-guide.md');
    if (!fs.existsSync(guide) || !text.includes('(references/swift-coding-guide.md)')) throw Error(`Missing Swift coding guide: ${name}`);
    if (source && hash(guide)!==hash(path.join(base,'architecture/swift-coding-guide.md'))) throw Error('Stale coding guide. Run npm run sync.');
    if (cfaSkills.includes(name)) {
      const gate = path.join(skill, 'references/cfa-change-gate.md');
      if (!fs.existsSync(gate) || !text.includes('(references/cfa-change-gate.md)')) throw Error(`Missing CFA change gate: ${name}`);
      if (source && hash(gate)!==hash(path.join(base, 'architecture/cfa-change-gate.md'))) throw Error('Stale CFA change gate. Run npm run sync.');
    }
    // Check actual Markdown file links throughout skill resources; examples/URLs are not opened.
    for(const relative of files(skill).filter(f=>f.endsWith('.md'))) {
      const file=path.join(skill,relative), content=fs.readFileSync(file,'utf8');
      if(/\/Users\/|\/home\//.test(content)) throw Error(`Machine-specific reference: ${relative}`);
      for(const match of content.matchAll(/\]\(([^)]+)\)/g)) {
        let link=match[1].split('#')[0];
        if(!link || /^[a-z]+:/i.test(link) || link.includes(' ')) continue;
        const resolved=path.resolve(path.dirname(file),decodeURIComponent(link));
        if(!resolved.startsWith(skill+path.sep) || !fs.existsSync(resolved)) throw Error(`Missing or external skill reference: ${relative} → ${link}`);
      }
    }
  }
  if(source) {
    if(json(path.join(base,'package.json')).version!==manifest.version) throw Error('Version mismatch.');
    for(const name of cfaSkills) if(hash(path.join(base,'architecture/cfa-specification.md'))!==hash(path.join(base,`skills/${name}/references/cfa-specification.md`))) throw Error('Stale architecture copy. Run npm run sync.');
    for(const dir of ['src','Documentation']) for(const file of files(path.join(base,'tools/architecture-dashboard',dir))) {
      if(hash(path.join(base,'tools/architecture-dashboard',dir,file))!==hash(path.join(base,'skills/cfa-architecture-review/scripts/dashboard',dir,file))) throw Error(`Stale bundled tool: ${file}`);
    }
    if (process.platform === 'darwin') verifyXcodeTemplateStructure(path.join(base, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate'));
  }
  return manifest;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {validate();console.log('CFA source, references, manifests and dependency copies validated.');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
