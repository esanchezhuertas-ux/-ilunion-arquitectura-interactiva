const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const records = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const viewport = {clientWidth:1100, clientHeight:760};
const context = vm.createContext({
  document:{querySelector:()=>viewport},
  window:{matchMedia:()=>({matches:false}), innerWidth:1363},
  records, console, Set, Map
});
const source = fs.readFileSync('app.js','utf8').replace(/init\(\);\s*$/, '');
vm.runInContext(source, context);
vm.runInContext('Object.assign(state, buildTree(records))',context);
const run = code => vm.runInContext(code,context);
assert.equal(records.length,294);
assert.equal(run('state.allNodes.filter(n => !n.isAnnotation).length'),294);
assert.equal(run('getVisibleNodes().length'),8,'Overview starts at a readable first level');
assert.equal(run('state.allNodes.find(n=>n.title === "ILUNION Retail").parent.title'),'Qué hacemos');
const scopes = run('state.allNodes.filter(n=>n.depth===1 || n.depth===2 && n.path[1]==="Qué hacemos").map(n=>n.id)');
for (const id of scopes) {
  context.scopeId=id;
  run('state.scopeRoot = state.allNodes.find(n=>n.id === scopeId); state.allNodes.forEach(n=>{n.collapsed=true});state.scopeRoot.collapsed=false; state.visibleNodes=getVisibleNodes();layoutDesktop(state.visibleNodes)');
  assert.ok(run('state.visibleNodes.every(n=>n.path.slice(0,state.scopeRoot.path.length).join("/") === state.scopeRoot.path.join("/"))'),'Scope never includes unrelated nodes');
  assert.ok(run('state.visibleNodes.every(n=>Object.values(n.layout).every(Number.isFinite))'),'Finite scoped desktop geometry');
  run('layoutMobile(state.visibleNodes)');
  assert.ok(run('state.visibleNodes.every(n=>Object.values(n.layout).every(Number.isFinite))'),'Finite mobile geometry');
  assert.equal(run('state.scopeRoot.layout.x'),28,'Mobile scope starts at left inset');
}
run('state.scopeRoot=null; state.allNodes.forEach(n=>{n.collapsed=false});');
assert.equal(run('getVisibleNodes().filter(n=>!n.isAnnotation).length'),294,'Full architecture retained');
assert.ok(run('searchMatches("fisioterapia").some(n=>n.title === "Fisioterapia")'),'Cross-area search still finds services');
assert.ok(run('searchMatches("retail").some(n=>n.title === "ILUNION Retail")'));
console.log(`PASS: ${records.length} pages preserved; ${scopes.length} scopes; desktop/mobile layout; global search.`);
