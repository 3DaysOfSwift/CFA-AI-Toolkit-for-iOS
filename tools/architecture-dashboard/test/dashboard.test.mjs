import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { dashboard } from '../src/dashboard.mjs';
import { scanSource } from '../src/analyse.mjs';
import { render } from '../src/render.mjs';

test('inventory counts creation separately from awaits and group scopes',()=>{
  const files=[scanSource('Task { await f() }; Task.detached {}; async let a=f(); withTaskGroup(of: Int.self) { group in group.addTask { 1 } }','App.swift')];
  const d=dashboard(files), values=Object.fromEntries(d.metrics.map(m=>[m.id,m.value]));
  assert.equal(values.creation,4);
  assert.equal(values.unstructured,2);
  assert.equal(values.children,2);
  assert.equal(values.await,1);
  assert.equal(values.parallel,null);
  assert.equal(values.sequential,null);
  assert.equal(d.scores,undefined);
});

test('explicit isolation annotations are classified, not inferred',()=>{
  const d=dashboard([
    scanSource('@MainActor class CoffeeViewModel {}','CoffeeViewModel.swift'),
    scanSource('@MainActor class CoffeeFeature {}','Features/CoffeeFeature.swift'),
    scanSource('// @MainActor\nclass Other {}','Other.swift')
  ]);
  assert.equal(d.metrics.find(m=>m.id==='ui-main').value,1);
  assert.equal(d.metrics.find(m=>m.id==='feature-main').value,1);
});

test('dashboard is first and rendered client JavaScript parses',()=>{
  const html=render({project:'Demo',generatedAt:'2026-09-13',revision:'abc',dirty:false,files:[],scope:{fileCount:0,skipped:[]},limitations:[]});
  assert.ok(html.indexOf('id="tab-dashboard"')<html.indexOf('id="tab-overview"'));
  assert.match(html,/id="tab-dashboard"[^>]*aria-selected="true"/);
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
});

test('dashboard shows counts first and metric clicks filter the source evidence',()=>{
  const file={path:'App.swift',...scanSource('Task {}; Task.detached {}; async let value=load()','App.swift')};
  const html=render({project:'Demo',generatedAt:'2026-09-13',revision:'abc',dirty:false,files:[file],scope:{fileCount:1,skipped:[]},limitations:[]});
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{value:id==='kind'?'all':'',innerHTML:'',textContent:'',events:{},setAttribute(){},append(){},insertAdjacentHTML(position,html){this.innerHTML+=html;},scrollIntoView(){this.scrolled=true;},after(child){this.afterChild=child;},prepend(child){this.firstChild=child;},addEventListener(name,fn){this.events[name]=fn;},focus(){}});
    return nodes.get(id);
  };
  let elementID=0;
  const document={getElementById:node,querySelector:()=>node('nav'),querySelectorAll:()=>[],createElement:()=>node('created-'+elementID++)};
  vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],{document});
  node('show-concurrency').events.click();
  assert.equal(node('tasks').hidden,false);
  assert.equal(node('concurrency-warnings').scrolled,true);
  assert.match(node('dash-metrics').innerHTML,/<strong>3<\/strong><span>Tasks/);
  assert.match(node('task-mix').innerHTML,/2 unstructured Tasks · 1 structured child Tasks/);
  assert.ok(!node('task-mix').innerHTML.includes('mix-bar'));
  assert.match(node('task-mix').innerHTML,/Why does this matter/);
  assert.ok(!html.includes('Not measured in this report'));
  assert.ok(!node('metric-definitions').innerHTML.includes('Parallel child Tasks'));
  assert.equal(node('separation-gauge').afterChild,undefined);
  assert.match(node('review').firstChild.innerHTML,/Business decisions/);
  assert.ok(html.indexOf('id="dash-metrics"')<html.indexOf('id="journeys"'));
  node('dash-metrics').events.click({target:{closest:()=>({dataset:{metric:'unstructured'}})}});
  assert.equal(node('match-count').textContent,'2 source matches');
  assert.equal(node('results-title').textContent,'Results · Unstructured Tasks');
  assert.match(html,/class="results-panel" aria-labelledby="results-title"/);
  assert.match(node('inspector').innerHTML,/💡 What is an unstructured Task/);
  assert.match(node('inspector').innerHTML,/code-focus/);
  assert.ok(node('inspector').innerHTML.indexOf('<pre>') < node('inspector').innerHTML.indexOf('💡'));
  assert.ok(!node('inspector').innerHTML.includes('Source context · highlighted instruction'));
  assert.match(node('inspector').innerHTML,/App.swift · Line 1/);
  assert.match(node('definitions').innerHTML,/cooperative cancellation/);
  assert.equal(node('dashboard').hidden,true);
  assert.equal(node('tasks').hidden,false);
  assert.match(node('task-categories').innerHTML,/data-metric="unstructured" aria-pressed="true"/);
  node('task-categories').events.click({target:{closest:()=>({dataset:{metric:'children'}})}});
  assert.equal(node('match-count').textContent,'1 source matches');
  assert.equal(node('results-title').textContent,'Results · Child Tasks');
  assert.match(node('task-categories').innerHTML,/data-metric="children" aria-pressed="true"/);
  node('search').value='missing';
  node('search').events.input();
  assert.equal(node('match-count').textContent,'0 source matches');
  assert.equal(node('empty-results').textContent,'No results for this search');
  assert.equal(node('results-layout').hidden,true);
  assert.equal(node('match-count').hidden,true);
  assert.match(node('task-categories').innerHTML,/data-metric="children" aria-pressed="true"/);
  node('task-categories').events.click({target:{closest:()=>({dataset:{metric:'framework'}})}});
  assert.equal(node('match-count').textContent,'0 source matches');
  assert.equal(node('empty-results').textContent,'No SwiftUI Tasks');
  assert.equal(node('inspector').innerHTML,'');
  node('kind').value='detached';
  node('search').value='';
  node('kind').events.change();
  assert.equal(node('results-layout').hidden,false);
  node('task-categories').events.click({target:{closest:()=>({dataset:{metric:'all'}})}});
  assert.equal(node('match-count').textContent,'3 source matches');
  assert.equal(node('empty-results').hidden,true);
  assert.equal(node('results-layout').hidden,false);
  assert.equal(node('search').value,'');
  node('tab-journey-panel').events.click();
  assert.equal(node('journey-panel').hidden,false);
  assert.equal(node('tasks').hidden,true);
});
