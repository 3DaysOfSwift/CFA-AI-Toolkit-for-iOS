// Null means unmeasured, never zero. Counts describe lexical source sites.
export function dashboard(files) {
  const sites = files.flatMap(f => f.sites);
  const count = (...kinds) => sites.filter(s => kinds.includes(s.kind)).length;
  const ui = file => /(?:View|ViewModel)\.swift$/.test(file) || file.includes('1 - View/');
  const model = file => !ui(file) && (file.includes('2 - AppModel/') || /(?:^|\/)(?:Model|Features)\//.test(file) || /(?:Manager|Worker|Repository|Store|Client|AppModel)\.swift$/.test(file));
  const taskKinds = ['task','detached','async-let','group-child'];
  const taskCount = predicate => sites.filter(s=>taskKinds.includes(s.kind) && predicate(s.file)).length;
  const annotations = sites.filter(s => s.kind === 'main-actor');
  const metric = (id,label,value,detail,kinds=[]) => ({id,label,value,detail,kinds});
  return {
    metrics: [
      metric('creation','Tasks',count('task','detached','async-let','group-child'),'Explicit Task, detached, async-let and possible group additions. Not a runtime task total.',['task','detached','async-let','group-child']),
      metric('unstructured','Unstructured Tasks',count('task','detached'),'Independent Task lifetimes, including detached Tasks. Correctly managed roots are valid; inspect waiting, cancellation and repeated-request policies before identifying a warning.',['task','detached']),
      metric('detached','Detached Tasks',count('detached'),'Included in Unstructured Tasks; created using Task.detached.',['detached']),
      metric('children','Child Tasks',count('async-let','group-child'),'Async-let bindings plus possible group additions. One site may create many children.',['async-let','group-child']),
      metric('parallel','Parallel child Tasks',null,'Requires a runtime trace. Structured child tasks permit concurrency; simultaneous execution is not guaranteed.'),
      metric('sequential','Sequential awaits',null,'Requires control-flow analysis; keyword counts do not prove an execution sequence.'),
      metric('await','Await',count('await'),'Potential suspension syntax, including handle awaits and for-await. Not actual suspensions.',['await']),
      metric('framework','SwiftUI Tasks',count('view-task','refresh'),'Task modifiers and refresh callbacks; separate from explicit task creation.',['view-task','refresh']),
      metric('viewmodel-tasks','ViewModel Tasks',taskCount(file=>file.endsWith('ViewModel.swift')),'Explicit task declarations in ViewModel-named files; not runtime ownership.',taskKinds),
      metric('model-tasks','Model Tasks',taskCount(model),'Explicit task declarations in model-classified files, using folder and filename heuristics.',taskKinds),
      metric('ui-main','UI · MainActor annotations',annotations.filter(s=>ui(s.file)).length,'Explicit annotations in UI-classified files. Does not measure inferred isolation or UI correctness.',['main-actor']),
      metric('feature-main','Model · MainActor annotations',annotations.filter(s=>model(s.file)).length,'Explicit annotations in model-classified files (folder and filename heuristics). Does not measure workload or business-logic volume.',['main-actor'])
    ],
    isolation: 'MainActor is appropriate for observable state and UI coordination. Annotation counts cannot distinguish short state updates from expensive feature work.',
    coverage: 'Source inventory with optional author-supplied journey observations; no runtime measurements.'
  };
}
