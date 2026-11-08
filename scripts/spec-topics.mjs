import fs from 'node:fs';
import path from 'node:path';
import { validatePublication } from '../skills/cfa-architecture-review/scripts/explanations.mjs';

// Topic files are a lossless reading edition of the canonical specification.
export function specTopics(base) {
  const source = fs.readFileSync(path.join(base, 'architecture/cfa-specification.md'), 'utf8');
  const headings = [];
  let inFence = false;
  let offset = 0;
  for (const line of source.match(/.*(?:\n|$)/g).filter(Boolean)) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    else if (!inFence && /^## (.+)/.test(line)) headings.push({ 1: line.match(/^## (.+)/)[1], index: offset });
    offset += line.length;
  }
  if (!headings.length) throw Error('The CFA specification has no topic headings.');
  const files = new Map();
  const sections = headings.map((heading, index) => {
    const slug = heading[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const name = `${String(index + 1).padStart(2, '0')}-${slug}.md`;
    const body = source.slice(heading.index, headings[index + 1]?.index ?? source.length);
    return { name, title: heading[1], body };
  });
  const intro = source.slice(0, headings[0].index);
  files.set('introduction.md', intro);
  const explanations = JSON.parse(fs.readFileSync(path.join(base, 'architecture/explanations/catalogue.json'), 'utf8'));
  const explanationByID = new Map();
  for (const explanation of explanations.topics) {
    if (explanationByID.has(explanation.id)) throw Error(`Duplicate explanation: ${explanation.id}`);
    validatePublication(explanation.publication);
    explanationByID.set(explanation.id, explanation);
  }
  const published = explanations.topics.filter(topic => topic.publication.status === 'published');
  files.set('explanations.md', `# CFA explanations\n\nThese free explanations explore the reasons behind CFA decisions. The current specification is authoritative if an explanation describes an earlier convention.\n\n${published.map(topic => `- [${topic.publication.verificationEvidence.title}](${topic.publication.url})`).join('\n')}\n`);
  files.set('examples/DeepLinkingExample.swift', fs.readFileSync(path.join(base, 'architecture/spec-examples/DeepLinkingExample.swift'), 'utf8'));
  for (const name of ['NotesReference.swift', 'NotesReferenceTests.swift']) files.set(`examples/${name}`, fs.readFileSync(path.join(base, 'architecture/spec-examples', name), 'utf8'));
  const appCatalogue = JSON.parse(fs.readFileSync(path.join(base, 'architecture/open-source-apps.json'), 'utf8'));
  const sourceURL = app => app.revision && app.sourcePath ? `${app.repository}/blob/${app.revision}/${app.sourcePath.split('/').map(encodeURIComponent).join('/')}` : null;
  for (const app of appCatalogue.apps) {
    if (!/^https:\/\/github\.com\/3DaysOfSwift\/[A-Za-z0-9._-]+$/.test(app.repository) || !app.name || !app.description || !Array.isArray(app.ruleIds)) throw Error('Invalid open-source app reference.');
    if ((app.revision || app.sourcePath) && (!/^[a-f0-9]{40}$/.test(app.revision ?? '') || !app.sourcePath || app.sourcePath.split('/').some(part => part === '..' || !part))) throw Error(`Invalid source revision for ${app.name}`);
  }
  const appList = appCatalogue.apps.map(app => `- **[${app.name}](${app.repository})** — ${app.description}.${sourceURL(app) ? ` [View source](${sourceURL(app)}).` : ''}`).join('\n');
  files.set('examples/open-source-apps.md', `# CFA project examples\n\n## Starter apps included in the toolkit\n\nThe toolkit repository and full packages include ready-to-open Xcode projects in \`starter-apps/\`. See the [starter app guide](https://github.com/3DaysOfSwift/CFA-AI-Toolkit-for-iOS/tree/main/starter-apps) for setup, project paths and tests. A separately installed skill may not include the projects; use the full toolkit or repository.\n\n- **Habit Tracker** — habits, daily progress, streaks, SwiftData and Settings.\n- **Habit Tracker Pro** — habits, charts and a StoreKit unlock.\n- **Todays Twenty** — daily practice, saved sessions and day-streak behaviour.\n\nUse these projects to trace a working screen through its ViewModel, Feature and services, as well as AppModel and tests. They are examples to inspect against the current specification, not a guarantee that every implementation is up to date.\n\n## Open-source iOS apps\n\nThese real projects illustrate different capabilities and migration contexts. The source links point to specific revisions; the project links open the current repositories. App code can use older naming or differ from current CFA rules. Inspect the linked behaviour and apply the current specification; a link does not certify whole-app conformance.\n\n${appList}\n`);
  files.set('examples/README.md', `# Deep-linking example\n\nRun on macOS 14 or later with Swift 6 language mode:\n\n\`swiftc -swift-version 6 -parse-as-library DeepLinkingExample.swift -o /tmp/cfa-deep-link-example && /tmp/cfa-deep-link-example\`\n\nThe example saves a safe destination, simulates a scene declining navigation, restores the request in a new Feature instance, and removes it after simulated navigation. It checks repeated delivery and a failed write. Expected output begins with “Passed”. The file store and handler are deliberately small teaching implementations: this is not a notification delegate, URL parser, multi-process store, or a real SwiftUI navigation flow. If navigation succeeds but removing the persisted request fails, the call throws and the request remains stored; a real app must handle that outcome rather than automatically reopening it. Real applications must handle expiration, duplicate deliveries across restarts and scene lifetimes according to the specification.\n`);
  for (const section of sections) files.set(`topics/${section.name}`, section.body.replace(/\]\(((?:swift-coding-guide|project-workflow|new-app-design-defaults)\.md(?:#[^)]*)?|spec\/(?:examples\/open-source-apps|explanations)\.md)\)/g, '](../../$1)'));
  const list = sections.map(section => {
    let fenced = false;
    const children = [];
    for (const line of section.body.split('\n')) {
      if (/^\s*```/.test(line)) fenced = !fenced;
      else if (!fenced && /^### /.test(line)) {
        const title = line.slice(4).trim();
        const anchor = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        children.push(`  - [${title}](topics/${section.name}#${anchor})`);
      }
    }
    return [`- [${section.title}](topics/${section.name})`, ...children].join('\n');
  }).join('\n');
  const topic = (title) => { const item = sections.find(section => section.title === title); if (!item) throw Error(`Missing specification section: ${title}`); return `[${title}](topics/${item.name})`; };
  const catalogue = JSON.parse(fs.readFileSync(path.join(base, 'architecture/spec-rule-catalog.json'), 'utf8'));
  const ids = new Set();
  for (const rule of catalogue.rules) {
    if (!/^CFA-SPEC-[A-Z]+-\d\d$/.test(rule.id) || ids.has(rule.id)) throw Error(`Invalid or duplicate rule ID: ${rule.id}`);
    ids.add(rule.id);
    for (const field of ['title','section','applies','strength','rule','why','example','verify']) if (typeof rule[field] !== 'string' || !rule[field].trim()) throw Error(`Missing ${field} in ${rule.id}`);
    const section = sections.find(item => item.title === rule.section);
    if (!section) throw Error(`Missing source section for ${rule.id}: ${rule.section}`);
    const runnable = rule.id === 'CFA-SPEC-LINK-01' ? '\n\n[Run the deep-linking example](../examples/README.md).' : '';
    const relevant = appCatalogue.apps.filter(app => app.ruleIds.includes(rule.id) && sourceURL(app));
    const sources = relevant.length ? `\n\n**Open-source code:** ${relevant.map(app => `[${app.name}](${sourceURL(app)})`).join(' · ')}. Inspect the specific behaviour; these projects may also contain older conventions.` : '';
    const related = (rule.explanationIds ?? []).map(id => {
      const explanation = explanationByID.get(id);
      if (!explanation) throw Error(`Unknown explanation ${id} for ${rule.id}`);
      return explanation;
    }).filter(explanation => explanation.publication.status === 'published');
    const learning = related.length ? `\n\n**Explanation:** ${related.map(item => `[${item.publication.verificationEvidence.title}](${item.publication.url})`).join(' · ')}.` : '';
    files.set(`rules/${rule.id.toLowerCase().replace('cfa-spec-', 'cfa-')}.md`, `# ${rule.id}: ${rule.title}\n\n**Applies when:** ${rule.applies}.\n\n**Strength:** ${rule.strength}.\n\n**Guidance:** ${rule.rule}\n\n**Why:** ${rule.why}\n\n**Example:** ${rule.example}${runnable}${sources}${learning}\n\n**Verify:** ${rule.verify}\n\n**Full rule, context and examples:** [${section.title}](../topics/${section.name}). This card is a reading aid; apply the complete canonical section.\n`);
  }
  const classified = new Set(catalogue.rules.map(rule => rule.section));
  for (const entry of catalogue.non_rule_sections ?? []) {
    if (!entry.reason?.trim() || !sections.some(section => section.title === entry.section) || classified.has(entry.section)) throw Error(`Invalid non-rule classification: ${entry.section}`);
    classified.add(entry.section);
  }
  for (const section of sections) if (!classified.has(section.title)) throw Error(`Unclassified specification section: ${section.title}`);
  for (const app of appCatalogue.apps) for (const id of app.ruleIds) if (!ids.has(id)) throw Error(`Unknown specification rule ${id} for ${app.name}`);
  const cards = catalogue.rules.map(rule => `- [${rule.id}: ${rule.title}](rules/${rule.id.toLowerCase().replace('cfa-spec-', 'cfa-')}.md)`).join('\n');
  files.set('README.md', `# CFA specification reading map\n\nThe authoritative source is [cfa-specification.md](../cfa-specification.md). These generated topic files reproduce its sections, with relative links adjusted; the structured rule cards are summaries, not replacements for the full rules. Edit the source and catalogue together and run \`node scripts/sync.mjs\` to refresh them. Read the complete source for a whole-app audit; for a focused task, use the relevant topics below and check related boundaries. The [change gate](../cfa-change-gate.md), [Swift coding guide](../swift-coding-guide.md) and [decision rationale](../explanations/guide.md) provide additional guidance. Examples illustrate rules; only build optional capabilities when the app requires them.\n\n## Find guidance by task\n\n- Working code: [bundled starter apps and open-source iOS projects](examples/open-source-apps.md).\n- Learn why: [CFA explanations](explanations.md).\n- Feature boundaries and shared workflows: ${topic('Define Features by Business Capability, Not by Screen or Tab')}; ${topic('Organize Behaviour into Cohesive Features')}.\n- AppModel, startup, device targets and listeners: ${topic('Use AppModel as the Composition Root and Feature Facade')}; ${topic('Use Application Launch as an Opportunity to Refresh Features')}.\n- Views, detail input, navigation and notifications: ${topic('Give Every Unique Screen Its Own ViewModel')}; ${topic('Keep Screen Initializers Clean')}; ${topic('Maintain an Absolute UI and Model Boundary')}.\n- Task ownership and shared requests: ${topic('Make Concurrency Behaviour Honest and Visible')}.\n- Storage, snapshots, sync and failures: ${topic('Keep Persistence Behind Repository Contracts')}.\n- File structure and target membership: ${topic('Make the Architecture Visible in the Folder Structure')}; ${topic('Use AppModel as the Composition Root and Feature Facade')}.\n- Testing and review: ${topic('Test the Same Boundaries the Architecture Advertises')}; ${topic('Review Checklist')}.\n\n## Structured rule cards\n\n${cards}\n\n## All specification sections\n\n${list}\n`);
  return files;
}
