import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { files } from './files.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const cfaSkills = ['cfa-app-creation', 'cfa-feature-work', 'cfa-architecture-adoption', 'swift-concurrency-migration', 'cfa-architecture-review', 'cfa-codebase-tidy', 'cfa-unit-tests'];
export const skills = [...cfaSkills, 'swift-code-quality'];
export const explanationFiles = ['guide.md', 'catalogue.json',
  ...JSON.parse(fs.readFileSync(path.join(root, 'architecture/explanations/catalogue.json'), 'utf8')).topics.map(topic => topic.note)];
export const iconSkills = ['cfa-app-creation', 'cfa-architecture-adoption', 'swift-concurrency-migration', 'cfa-codebase-tidy'];
export const starterIcon = 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate/Source/Assets.xcassets/AppIcon.appiconset';
// Explicit release allowlist: working migration records must never be swept up.
export const migrationEvidenceFiles = [
  'evidence.mjs', 'schema.json', 'README.md', 'template/record.json', 'template/case-study.md',
  'examples/synthetic-serial-writes/record.json', 'examples/synthetic-serial-writes/case-study.md',
  'examples/synthetic-serial-writes/exercise-note.md'
];
export function sync(base = root) {
  const copy = (source,destination) => {
    const from=path.join(base,source), to=path.join(base,destination);
    fs.mkdirSync(path.dirname(to),{recursive:true});
    fs.copyFileSync(from,to);
  };
  for (const name of skills) {
    for (const file of ['project-workflow.md', 'new-app-design-defaults.md']) {
      copy(`architecture/${file}`, `skills/${name}/references/${file}`);
    }
  }
  for (const name of skills) copy('architecture/swift-coding-guide.md',`skills/${name}/references/swift-coding-guide.md`);
  for (const name of skills) {
    for (const file of explanationFiles) copy(`architecture/explanations/${file}`, `skills/${name}/references/explanations/${file}`);
    copy('tools/explanations/explanations.mjs', `skills/${name}/scripts/explanations.mjs`);
  }
  for (const name of iconSkills) {
    for (const file of files(path.join(base, starterIcon))) {
      copy(`${starterIcon}/${file}`, `skills/${name}/assets/AppIcon.appiconset/${file}`);
    }
  }
  for (const name of cfaSkills) copy('architecture/cfa-specification.md',`skills/${name}/references/cfa-specification.md`);
  for (const name of cfaSkills) copy('architecture/cfa-change-gate.md',`skills/${name}/references/cfa-change-gate.md`);
  for (const name of ['cfa-app-creation','cfa-feature-work','cfa-architecture-adoption','swift-concurrency-migration']) copy('architecture/reference-feature.md',`skills/${name}/references/reference-feature.md`);
  for (const name of ['cfa-feature-work','cfa-architecture-adoption','swift-concurrency-migration','cfa-codebase-tidy','cfa-unit-tests']) copy('architecture/product-behaviour-contract.md',`skills/${name}/references/product-behaviour-contract.md`);
  const tool=path.join(base,'tools/architecture-dashboard');
  const bundled=path.join(base,'skills/cfa-architecture-review/scripts/dashboard');
  if (fs.existsSync(bundled)) {
    if(fs.lstatSync(bundled).isSymbolicLink()) throw Error('Refusing to replace a linked dependency folder.');
    fs.rmSync(bundled,{recursive:true});
  }
  for(const dir of ['src','Documentation']) for(const file of files(path.join(tool,dir))) copy(`tools/architecture-dashboard/${dir}/${file}`,`skills/cfa-architecture-review/scripts/dashboard/${dir}/${file}`);
  for(const file of ['README.md','package.json']) copy(`tools/architecture-dashboard/${file}`,`skills/cfa-architecture-review/scripts/dashboard/${file}`);
  for(const skill of skills) copy('LICENSE',`skills/${skill}/LICENSE`);
  copy('scripts/verify-ios-orientations.mjs', 'skills/cfa-app-creation/scripts/verify-ios-orientations.mjs');
  copy('scripts/verify-ios-app-identity.mjs', 'skills/cfa-app-creation/scripts/verify-ios-app-identity.mjs');
  copy('LICENSE','skills/cfa-architecture-review/scripts/dashboard/LICENSE');
  for (const file of migrationEvidenceFiles) {
    copy(`tools/migration-evidence/${file}`, `skills/swift-concurrency-migration/scripts/evidence/${file}`);
  }
  const captureGuide = fs.readFileSync(path.join(base, 'architecture/migration-evidence.md'), 'utf8')
    .replace('../tools/migration-evidence/README.md', '../scripts/evidence/README.md');
  fs.writeFileSync(path.join(base, 'skills/swift-concurrency-migration/references/migration-evidence.md'), captureGuide);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) { sync(); console.log('Bundled skill dependencies synchronised.'); }
