#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const weights = {pass: 1, concern: 0.5, problem: 0};
export function assess(criteria) {
  if (!Array.isArray(criteria) || !criteria.length) throw Error('Provide at least one reviewed criterion.');
  for (const c of criteria) {
    if (!c.title || !c.detail || !Object.hasOwn(weights, c.status)) throw Error('Each criterion needs a title, detail and a pass, concern or problem status.');
  }
  return Math.round(criteria.reduce((sum, c) => sum + weights[c.status], 0) * 100 / criteria.length);
}
export function renderHealthReport(data, iconData = '') {
  if (!data.app || !data.summary || !data.scope || !data.conclusion) throw Error('Provide an app name, summary, scope and conclusion.');
  const score = data.scoreAvailable === false ? null : assess(data.criteria);
  const sections = ['pass','concern','problem'].map(status => {
    const rows = data.criteria.filter(c => c.status === status);
    if (!rows.length) return '';
    const title = {pass:'What is working well',concern:'Worth a closer look',problem:'Problems to address'}[status];
    return `<section><h2>${title}</h2>${rows.map(c => `<article class="finding"><span class="indicator ${status}" aria-label="${status}">${{pass:'✓',concern:'!',problem:'×'}[status]}</span><div><h3>${escape(c.title)}</h3><p>${escape(c.detail)}</p>${c.evidence ? `<p class="evidence">Evidence: ${escape(c.evidence)}</p>` : ''}</div></article>`).join('')}</section>`;
  }).join('');
  const stamp = score === null ? 'Needs investigation' : score >= 75 ? 'Good foundation' : 'Needs attention';
  const stampClass = score !== null && score >= 75 ? 'positive' : 'negative';
  const icon = iconData ? `<img class="icon" src="${escape(iconData)}" alt="${escape(data.app)} app icon">` : '<div class="icon placeholder" aria-hidden="true">⌘</div>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(data.app)} · Concurrency Health Check</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#111214;color:#f2f3f4;font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:940px;margin:auto;padding:64px 30px 90px}header{display:flex;align-items:center;gap:22px}.icon{width:76px;height:76px;border-radius:18px;object-fit:cover;box-shadow:0 8px 30px #0006}.placeholder{display:grid;place-items:center;background:#292b30;font-size:30px}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.04em;margin:7px 0}h2{font-size:1.4rem;margin:0 0 22px}h3{font-size:1.04rem;margin:0 0 5px;line-height:1.4}.eyebrow{font-size:.76rem;text-transform:uppercase;letter-spacing:.17em;color:#aab1b6;font-weight:700}.app{color:#d2d7db;font-weight:600}.intro{font-size:1.15rem;color:#d4d8db;max-width:800px;margin:32px 0}.verdict{display:flex;gap:25px;align-items:center;border:1px solid #373b3f;background:#1b1d20;border-radius:18px;padding:25px 28px;margin:36px 0}.verdict>div:first-child{border-right:1px solid #96a4aa;padding-right:25px}.number{font-size:3.6rem;font-weight:750;letter-spacing:-.05em;line-height:1}.caption{color:#b5bec2;font-size:.88rem;margin-top:6px}.stamp{display:inline-block;border:1px solid;border-radius:6px;padding:3px 9px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800}.partial{color:#f5c878;border-color:#9b7430}.positive{color:#8de2ac;border-color:#4f996a}.negative{color:#ff9999;border-color:#a64b4b}section{margin:48px 0}.finding{display:flex;gap:14px;padding:19px 0;border-top:1px solid #33373b}.finding p{margin:0;color:#cbd0d4}.indicator{flex:none;width:25px;height:25px;border-radius:7px;display:grid;place-items:center;font-weight:800;line-height:1}.pass{background:#176739;color:#a7f4bf}.concern{background:#725019;color:#ffe0a0}.problem{background:#7a282c;color:#ffd0d0}.evidence{font-size:.85rem;color:#92a4ad!important;margin-top:8px!important;overflow-wrap:anywhere}.conclusion{border-left:4px solid #92a8ad;background:#1c2021;padding:26px 30px;border-radius:0 12px 12px 0}.conclusion h2{margin:0 0 10px}.conclusion p{margin:0}.method{font-size:.85rem;color:#aeb7bb;margin-top:30px} @media(max-width:550px){.wrap{padding:36px 20px}.verdict{align-items:flex-start;flex-direction:column}.verdict>div:first-child{border-right:0;padding-right:0}header{align-items:flex-start}.icon{width:58px;height:58px;border-radius:14px}}
</style></head><body><main class="wrap"><header>${icon}<div><div class="eyebrow">Swift Concurrency</div><div class="app">${escape(data.app)}</div><h1>Health Check</h1></div></header><p class="intro">${escape(data.summary)}</p><div class="verdict"><div><div class="number">${score === null ? '—' : score + '%'}</div><div class="caption">${score === null ? 'Score unavailable' : 'Reviewed criteria'}</div></div><div><span class="stamp ${stampClass}">${stamp}</span><div class="caption">${escape(data.scope)}</div></div></div>${sections}<section class="conclusion"><div class="eyebrow">The assessment</div><h2>Conclusion</h2><p>${escape(data.conclusion)}</p></section></main></body></html>`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error('Use whole-app-health.mjs to inventory the project and validate review coverage before generating a Health Check.');
  process.exitCode = 1;
}
