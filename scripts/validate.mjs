import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { root, skills, cfaSkills, referenceFeatureSkills, behaviourContractSkills, iconSkills, starterIcon, migrationEvidenceFiles, explanationFiles, projectAnalysisFiles } from './sync.mjs';
import { validateCatalogue, audit } from '../tools/explanations/explanations.mjs';
import { files, hash, isReleasePath, json } from './files.mjs';
import { verifyXcodeTemplateStructure } from './verify-xcode-template-structure.mjs';
import { verifyTemplateOrientations } from './verify-ios-orientations.mjs';
import { specTopics } from './spec-topics.mjs';
const productDescription = 'CFA AI Toolkit for iOS: AI skills and tools to build, modernise, test and maintain SwiftUI apps with Swift Concurrency.';
const productIdentifier = 'ios-app-development-cfa';
const publisherName = '3 Days of Swift Concurrency';
const publisherURL = 'https://www.3daysofswiftconcurrency.com/';
const repositoryURL = 'https://github.com/3DaysOfSwiftConcurrency/CFA-AI-Toolkit-for-iOS';
function markdownAnchors(file) {
  const anchors = new Set(), counts = new Map();
  let fence;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    if (delimiter) {
      if (!fence) fence = delimiter[1][0];
      else if (delimiter[1][0] === fence) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*$/)?.[1];
    if (!heading) continue;
    const base = heading.toLowerCase().trim()
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*_~]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-');
    const duplicate = counts.get(base) ?? 0;
    counts.set(base, duplicate + 1);
    anchors.add(duplicate ? `${base}-${duplicate}` : base);
  }
  return anchors;
}
function validateSkillInterface(file, name) {
  const lines = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/);
  const required = ['display_name', 'short_description', 'default_prompt'];
  if (lines[0] !== 'interface:' || lines.length !== required.length + 1) {
    throw Error(`Invalid skill interface metadata structure: ${name}`);
  }
  const values = new Map();
  for (const line of lines.slice(1)) {
    const match = line.match(/^  ([a-z_]+): (.+)$/);
    if (!match || !required.includes(match[1]) || values.has(match[1])) {
      throw Error(`Invalid skill interface metadata structure: ${name}`);
    }
    let value;
    try { value = JSON.parse(match[2]); } catch { /* handled below */ }
    if (typeof value !== 'string' || !value.trim()) {
      throw Error(`Skill interface strings must be quoted and non-empty: ${name}`);
    }
    values.set(match[1], value);
  }
  for (const field of required) if (!values.has(field)) throw Error(`Missing ${field} in skill interface metadata: ${name}`);
  const description = values.get('short_description');
  if (description.length < 25 || description.length > 64) {
    throw Error(`Skill short_description must contain 25 to 64 characters: ${name}`);
  }
  if (!new RegExp(`\\$${name}(?![a-z0-9-])`).test(values.get('default_prompt'))) {
    throw Error(`Skill default prompt does not invoke $${name}: ${name}`);
  }
}
function validateSkillFrontmatter(text, name) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---(?:\s|$)/);
  if (!match) throw Error(`Invalid skill frontmatter: ${name}`);
  const lines = match[1].split(/\r?\n/);
  const values = new Map();
  for (const line of lines) {
    const field = line.match(/^(name|description):\s+(.+)$/);
    if (!field || values.has(field[1])) throw Error(`Invalid skill frontmatter structure: ${name}`);
    values.set(field[1], field[2]);
  }
  if (lines.length !== 2 || values.get('name') !== name || !/^[a-z0-9-]{1,63}$/.test(name)) {
    throw Error(`Skill frontmatter name must match its package: ${name}`);
  }
  const rawDescription = values.get('description');
  let description;
  if (rawDescription.startsWith('"')) {
    try { description = JSON.parse(rawDescription); } catch { /* handled below */ }
  } else {
    description = rawDescription.replace(/\s+#.*$/, '');
    if (/:\s/.test(description)) throw Error(`Unquoted colon in skill description: ${name}`);
  }
  if (typeof description !== 'string' || !description.trim()) throw Error(`Invalid skill description: ${name}`);
}
export function validate(base=root,{source=true,checkXcodeProjects=true}={}) {
  const moduleFiles = ['scripts', 'skills', ...(source ? ['tools'] : [])].flatMap(folder => {
    const directory = path.join(base, folder);
    return fs.existsSync(directory) ? files(directory).map(file => path.posix.join(folder, file)) : [];
  }).filter(file => file.endsWith('.mjs'));
  for (const relative of moduleFiles) {
    const moduleFile = path.join(base, relative);
    const moduleText = fs.readFileSync(moduleFile, 'utf8');
    for (const match of moduleText.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
      const dependency = path.resolve(path.dirname(moduleFile), match[1]);
      if (!fs.statSync(dependency, { throwIfNoEntry: false })?.isFile()) {
        throw Error(`Missing packaged module dependency: ${relative} → ${match[1]}`);
      }
    }
  }
  const skillEntries = fs.readdirSync(path.join(base, 'skills'), { withFileTypes: true });
  const actualSkills = skillEntries.map(entry => entry.name).sort();
  const expectedSkills = [...skills].sort();
  if (skillEntries.some(entry => !entry.isDirectory()) ||
      JSON.stringify(actualSkills) !== JSON.stringify(expectedSkills)) {
    throw Error(`Unexpected or missing skill package: expected exactly ${expectedSkills.join(', ')}.`);
  }
  const expectedTopics = specTopics(base);
  for (const folder of ['architecture/spec', ...cfaSkills.map(name => `skills/${name}/references/spec`)]) {
    const directory = path.join(base, folder);
    if (!fs.existsSync(directory) || JSON.stringify(files(directory).sort()) !== JSON.stringify([...expectedTopics.keys()].sort())) throw Error(`Missing or unexpected specification topics: ${folder}`);
    for (const [file, contents] of expectedTopics) if (fs.readFileSync(path.join(directory, file), 'utf8') !== contents) throw Error(`Stale specification topic: ${folder}/${file}. Run npm run sync.`);
  }
  const explanationDirectory = path.join(base, 'architecture/explanations');
  const explanationCatalogue = json(path.join(explanationDirectory, 'catalogue.json'));
  validateCatalogue(explanationCatalogue, explanationDirectory, { sourceRoot: path.join(base, 'architecture') });
  if (audit(explanationCatalogue, path.join(base, 'architecture')).unmapped.length) {
    throw Error('Unmapped canonical sections: run npm run explanations:audit and update the rationale catalogue.');
  }
  const manifest=json(path.join(base,'.codex-plugin/plugin.json'));
  if(manifest.name!==productIdentifier) throw Error('Unexpected plugin identifier.');
  const pluginInterface=manifest.interface;
  if(pluginInterface?.displayName!=='CFA AI Toolkit for iOS' || pluginInterface.developerName!==publisherName ||
      pluginInterface.category!=='Productivity' || typeof pluginInterface.shortDescription!=='string' ||
      !pluginInterface.shortDescription.trim() || typeof pluginInterface.longDescription!=='string' ||
      !pluginInterface.longDescription.includes('Eight skills') ||
      JSON.stringify(pluginInterface.capabilities)!==JSON.stringify(['Read','Write']) ||
      !Array.isArray(pluginInterface.defaultPrompt) || pluginInterface.defaultPrompt.length<5 ||
      pluginInterface.defaultPrompt.some(prompt=>typeof prompt!=='string' || !prompt.trim())) {
    throw Error('Invalid Codex plugin interface metadata.');
  }
  if(manifest.description!==productDescription) throw Error('Unexpected plugin description.');
  if(manifest.author?.name!==publisherName) throw Error('Unexpected plugin publisher.');
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
  const portable=json(path.join(base,'plugin.json'));
  const packageFile=path.join(base,'package.json');
  const packageManifest=fs.existsSync(packageFile) ? json(packageFile) : undefined;
  const dashboardManifest=json(path.join(base,'skills/cfa-architecture-review/scripts/dashboard/package.json'));
  const requiredPortableKeywords=['swift','swiftui','ios','swift-concurrency','architecture','cfa'];
  if(portable.$schema!=='https://agent-plugins.org/schemas/1.0.0/plugin.schema.json' ||
      portable.name!==manifest.name || portable.version!==manifest.version || portable.license!==manifest.license ||
      portable.author?.name!==publisherName || portable.author?.url!==publisherURL ||
      portable.homepage!==repositoryURL || portable.repository!==repositoryURL ||
      !Array.isArray(portable.keywords) || requiredPortableKeywords.some(keyword=>!portable.keywords.includes(keyword))) {
    throw Error('Portable plugin manifest does not match Codex manifest.');
  }
  if(portable.description!==productDescription ||
      (packageManifest && (packageManifest.name!==productIdentifier || packageManifest.version!==manifest.version ||
        packageManifest.license!==manifest.license || packageManifest.description!==productDescription))) {
    throw Error('Plugin and package identity must use the current CFA AI Toolkit for iOS metadata.');
  }
  if(dashboardManifest.name!=='cfa-architecture-dashboard' || dashboardManifest.version!==manifest.version ||
      dashboardManifest.license!==manifest.license || dashboardManifest.engines?.node!=='>=20' ||
      dashboardManifest.bin?.['swift-architecture']!=='./src/cli.mjs') {
    throw Error('Bundled dashboard package identity does not match the toolkit release.');
  }
  const dashboardCLI=path.join(base,'skills/cfa-architecture-review/scripts/dashboard',dashboardManifest.bin['swift-architecture']);
  const dashboardCLIStat=fs.statSync(dashboardCLI,{throwIfNoEntry:false});
  if(!dashboardCLIStat?.isFile() || (process.platform!=='win32' && !(dashboardCLIStat.mode & 0o111))) {
    throw Error('Bundled dashboard command must be an executable file.');
  }
  if(source) {
    const sourceExamples = files(path.join(base,'examples/migration')).filter(isReleasePath).sort();
    const bundledExamples = files(path.join(base,'skills/swift-concurrency-migration/assets/migration-examples')).filter(isReleasePath).sort();
    if (JSON.stringify(sourceExamples) !== JSON.stringify(bundledExamples)) throw Error('Migration example files differ from the bundled skill. Run npm run sync.');
    for (const file of sourceExamples) if (hash(path.join(base,'examples/migration',file)) !== hash(path.join(base,'skills/swift-concurrency-migration/assets/migration-examples',file))) throw Error(`Stale migration example: ${file}`);
    if (JSON.stringify(files(path.join(base,'skills/swift-concurrency-migration/scripts/project-analysis')).sort()) !== JSON.stringify([...projectAnalysisFiles].sort())) throw Error('Unexpected or missing migration project analysis files.');
    for (const file of projectAnalysisFiles) if (hash(path.join(base,'tools/architecture-dashboard/src',file)) !== hash(path.join(base,'skills/swift-concurrency-migration/scripts/project-analysis',file))) throw Error(`Stale migration project analysis: ${file}`);
    const releaseNote = path.join(base, `docs/RELEASE-v${manifest.version}.md`);
    const changelog = fs.readFileSync(path.join(base, 'CHANGELOG.md'), 'utf8');
    if (!fs.existsSync(releaseNote) || !new RegExp(`^## ${manifest.version.replaceAll('.', '\\.')}(?:\\s|$)`, 'm').test(changelog)) {
      throw Error(`Missing release note or changelog entry for ${manifest.version}.`);
    }
  }
  const evidenceFolder = path.join(base, 'skills/swift-concurrency-migration/scripts/evidence');
  if (JSON.stringify(files(evidenceFolder).sort()) !== JSON.stringify([...migrationEvidenceFiles].sort())) {
    throw Error('Migration evidence package differs from its explicit allowlist; do not package working case records.');
  }
  const captureReference = path.join(base, 'skills/swift-concurrency-migration/references/migration-evidence.md');
  const migrationEntry = fs.readFileSync(path.join(base, 'skills/swift-concurrency-migration/SKILL.md'), 'utf8');
  if (!fs.existsSync(captureReference) || !migrationEntry.includes('(references/migration-evidence.md)')) throw Error('Missing opt-in migration evidence entry point.');
  if (source) {
    if (JSON.stringify(files(path.join(base, 'tools/migration-evidence')).sort()) !== JSON.stringify([...migrationEvidenceFiles].sort())) throw Error('Keep working evidence outside distributable tooling.');
    for (const file of migrationEvidenceFiles) {
      if (hash(path.join(evidenceFolder, file)) !== hash(path.join(base, 'tools/migration-evidence', file))) throw Error(`Stale migration evidence dependency: ${file}`);
    }
    const guide = fs.readFileSync(path.join(base, 'architecture/migration-evidence.md'), 'utf8').replace('../skills/swift-concurrency-migration/scripts/evidence/README.md', '../scripts/evidence/README.md');
    if (guide !== fs.readFileSync(captureReference, 'utf8')) throw Error('Stale migration capture guide. Run npm run sync.');
  }
  execFileSync(process.execPath, [path.join(evidenceFolder, 'evidence.mjs'), 'validate', path.join(evidenceFolder, 'examples/synthetic-serial-writes/record.json')], { stdio: 'pipe' });
  const orientationChecker = path.join(base, 'skills/cfa-app-creation/scripts/verify-ios-orientations.mjs');
  if (!fs.existsSync(orientationChecker)) throw Error('Missing bundled orientation checker.');
  if (source && hash(orientationChecker) !== hash(path.join(base, 'scripts/verify-ios-orientations.mjs'))) {
    throw Error('Stale orientation checker. Run npm run sync.');
  }
  const appIdentityChecker = path.join(base, 'skills/cfa-app-creation/scripts/verify-ios-app-identity.mjs');
  if (!fs.existsSync(appIdentityChecker)) throw Error('Missing bundled app identity checker.');
  if (source && hash(appIdentityChecker) !== hash(path.join(base, 'scripts/verify-ios-app-identity.mjs'))) {
    throw Error('Stale app identity checker. Run npm run sync.');
  }
  for(const file of ['LICENSE','README.md','docs/INSTALLATION.md','docs/PRIVACY.md']) if(!fs.existsSync(path.join(base,file))) throw Error(`Missing ${file}`);
  for(const name of skills) {
    const skill=path.join(base,'skills',name);
    const text=fs.readFileSync(path.join(skill,'SKILL.md'),'utf8');
    const skillLicense=path.join(skill,'LICENSE');
    if(!fs.existsSync(skillLicense) || hash(skillLicense)!==hash(path.join(base,'LICENSE'))) {
      throw Error(`Missing or stale skill licence: ${name}. Run npm run sync.`);
    }
    const agentMetadata = path.join(skill, 'agents/openai.yaml');
    if (!fs.existsSync(agentMetadata)) throw Error(`Missing skill interface metadata: ${name}`);
    validateSkillInterface(agentMetadata, name);
    validateSkillFrontmatter(text, name);
    if (referenceFeatureSkills.includes(name)) {
      const reference = path.join(skill, 'references/reference-feature.md');
      if (!fs.existsSync(reference) || !text.includes('(references/reference-feature.md)')) throw Error(`Missing reference Feature entry point: ${name}`);
      if (hash(reference) !== hash(path.join(base, 'architecture/reference-feature.md'))) throw Error(`Stale reference Feature: ${name}. Run npm run sync.`);
    }
    if (behaviourContractSkills.includes(name)) {
      const reference = path.join(skill, 'references/product-behaviour-contract.md');
      if (!fs.existsSync(reference) || !text.includes('(references/product-behaviour-contract.md)')) throw Error(`Missing product behaviour contract entry point: ${name}`);
      if (hash(reference) !== hash(path.join(base, 'architecture/product-behaviour-contract.md'))) throw Error(`Stale product behaviour contract: ${name}. Run npm run sync.`);
    }
    const explanations = path.join(skill, 'references/explanations');
    if (!text.includes('(references/explanations/guide.md)')) throw Error(`Missing rationale entry point: ${name}`);
    if (JSON.stringify(files(explanations).sort()) !== JSON.stringify([...explanationFiles].sort())) throw Error(`Unexpected rationale files: ${name}`);
    for (const file of explanationFiles) {
      if (hash(path.join(explanations, file)) !== hash(path.join(explanationDirectory, file))) throw Error(`Stale rationale dependency: ${name}/${file}`);
    }
    validateCatalogue(json(path.join(explanations, 'catalogue.json')), explanations);
    const explanationHelper = path.join(skill, 'scripts/explanations.mjs');
    if (!fs.existsSync(explanationHelper)) throw Error(`Missing explanation helper: ${name}`);
    if (source && hash(explanationHelper) !== hash(path.join(base, 'tools/explanations/explanations.mjs'))) throw Error(`Stale explanation helper: ${name}`);
    if(text.includes('[TODO:')) throw Error(`Unfinished skill: ${name}`);
    if (iconSkills.includes(name)) {
      const iconSet = path.join(skill, 'assets/AppIcon.appiconset');
      const contents = json(path.join(iconSet, 'Contents.json'));
      const imageEntry = contents.images?.find(image => image.idiom === 'universal' && image.platform === 'ios' && image.size === '1024x1024');
      if (imageEntry?.filename !== 'CFA-App-Icon.png') throw Error(`Missing starter app icon mapping: ${name}`);
      const png = fs.readFileSync(path.join(iconSet, imageEntry.filename));
      if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
          png.readUInt32BE(16) !== 1024 || png.readUInt32BE(20) !== 1024) {
        throw Error(`Invalid 1024px starter app icon: ${name}`);
      }
      if (source && checkXcodeProjects) {
        for (const file of ['Contents.json', 'CFA-App-Icon.png']) {
          if (hash(path.join(iconSet, file)) !== hash(path.join(base, starterIcon, file))) {
            throw Error(`Stale starter app icon: ${name}. Run npm run sync.`);
          }
        }
      }
    }
    for (const file of ['project-workflow.md', 'new-app-design-defaults.md']) {
      const reference = path.join(skill, 'references', file);
      if (!fs.existsSync(reference)) throw Error(`Missing workflow reference: ${name}/${file}`);
      if (source && hash(reference) !== hash(path.join(base, 'architecture', file))) {
        throw Error(`Stale workflow reference: ${name}/${file}. Run npm run sync.`);
      }
    }
    if (!text.includes('(references/project-workflow.md)')) throw Error(`Missing workflow policy entry point: ${name}`);
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
    for(const name of cfaSkills) if(hash(path.join(base,'architecture/cfa-specification.md'))!==hash(path.join(base,`skills/${name}/references/cfa-specification.md`))) throw Error('Stale architecture copy. Run npm run sync.');
    for(const dir of ['src','Documentation']) {
      const sourceFiles = files(path.join(base,'tools/architecture-dashboard',dir)).sort();
      const bundledFiles = files(path.join(base,'skills/cfa-architecture-review/scripts/dashboard',dir)).sort();
      if (JSON.stringify(sourceFiles) !== JSON.stringify(bundledFiles)) throw Error(`Bundled dashboard ${dir} files differ. Run npm run sync.`);
      for(const file of sourceFiles) if(hash(path.join(base,'tools/architecture-dashboard',dir,file))!==hash(path.join(base,'skills/cfa-architecture-review/scripts/dashboard',dir,file))) throw Error(`Stale bundled tool: ${file}`);
    }
    for (const file of ['README.md', 'package.json']) {
      if (hash(path.join(base, 'tools/architecture-dashboard', file)) !== hash(path.join(base, 'skills/cfa-architecture-review/scripts/dashboard', file))) throw Error(`Stale bundled dashboard ${file}. Run npm run sync.`);
    }
  }
  const dashboardLicense=path.join(base,'skills/cfa-architecture-review/scripts/dashboard/LICENSE');
  if(!fs.existsSync(dashboardLicense) || hash(dashboardLicense)!==hash(path.join(base,'LICENSE'))) {
    throw Error('Missing or stale bundled dashboard licence. Run npm run sync.');
  }
  const markdownFiles = [
    ...['README.md', 'AGENTS.md', 'CONTRIBUTING.md'].filter(file => fs.existsSync(path.join(base, file))),
    ...['architecture', 'docs', 'skills', 'tools', 'evals', 'examples'].flatMap(folder => {
      const directory = path.join(base, folder);
      return fs.existsSync(directory) ? files(directory).filter(file => file.endsWith('.md')).map(file => path.posix.join(folder, file)) : [];
    })
  ];
  const anchorCache = new Map();
  for (const relative of markdownFiles) {
    const markdown = fs.readFileSync(path.join(base, relative), 'utf8');
    const localReferences = [
      ...[...markdown.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]),
      ...[...markdown.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map(match => match[1])
    ];
    for (const reference of localReferences) {
      const cleaned = reference.trim().replace(/^<|>$/g, '');
      if (/^[a-z]+:/i.test(cleaned)) continue;
      const [rawLink, rawFragment] = cleaned.split('#');
      let link, fragment;
      try {
        link = decodeURIComponent(rawLink);
        fragment = rawFragment === undefined ? undefined : decodeURIComponent(rawFragment);
      } catch { throw Error(`Invalid encoded documentation reference: ${relative} → ${cleaned}`); }
      const current = path.join(base, relative);
      const resolved = link ? path.resolve(path.dirname(current), link) : current;
      if ((!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) || !fs.existsSync(resolved)) {
        throw Error(`Broken local documentation reference: ${relative} → ${link}`);
      }
      if (fragment && resolved.endsWith('.md')) {
        if (!anchorCache.has(resolved)) anchorCache.set(resolved, markdownAnchors(resolved));
        if (!anchorCache.get(resolved).has(fragment)) {
          throw Error(`Broken local documentation anchor: ${relative} → ${cleaned}`);
        }
      }
    }
  }
  if (source && checkXcodeProjects) {
    if (process.platform === 'darwin') {
      verifyXcodeTemplateStructure(path.join(base, 'templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate'));
      verifyTemplateOrientations(base);
    }
    execFileSync('python3', [path.join(base, 'scripts/sync-habit-template.py'), '--check'], { stdio: 'pipe' });
    execFileSync('python3', [path.join(base, 'scripts/sync-day-streak-template.py'), '--check'], { stdio: 'pipe' });
  }
  return manifest;
}
if(process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url===pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--skip-xcode-projects')) {
      throw Error('Usage: node scripts/validate.mjs [--skip-xcode-projects]');
    }
    const checkXcodeProjects = args.length === 0;
    validate(root, {checkXcodeProjects});
    console.log('CFA source, references, manifests and dependency copies validated.');
    if (!checkXcodeProjects) console.log('Starter app and Xcode template checks skipped.');
  }
  catch(error){console.error(error.message);process.exitCode=1;}
}
