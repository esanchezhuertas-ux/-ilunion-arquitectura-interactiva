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
// Initial overview remains a miniature, with room around it like the reference.
run('state.visibleNodes=getVisibleNodes();layoutDesktop(state.visibleNodes)');
const initialMini = run(`(() => {
 const bounds=minimapDrawingBounds(284,120);
 return {cardWidth:state.root.layout.width*284/bounds.width,
   center:bounds.left+bounds.width/2,
   contentCenter:(Math.min(...state.visibleNodes.map(n=>n.layout.x))+Math.max(...state.visibleNodes.map(n=>n.layout.x+n.layout.width)))/2};
})()`);
assert.ok(initialMini.cardWidth >= 40 && initialMini.cardWidth <= 46,'Initial cards stay compact');
assert.equal(initialMini.center,initialMini.contentCenter,'Compact overview remains centered');
const scopes = run('state.allNodes.filter(n=>n.depth===1 || n.depth===2 && n.path[1]==="Qué hacemos").map(n=>n.id)');
for (const id of scopes) {
  context.scopeId=id;
  run('state.scopeRoot = state.allNodes.find(n=>n.id === scopeId); state.allNodes.forEach(n=>{n.collapsed=true});state.scopeRoot.collapsed=false; state.visibleNodes=getVisibleNodes();layoutDesktop(state.visibleNodes)');
  assert.ok(run('state.visibleNodes.every(n=>n.path.slice(0,state.scopeRoot.path.length).join("/") === state.scopeRoot.path.join("/"))'),'Scope never includes unrelated nodes');
  assert.ok(run('state.visibleNodes.every(n=>Object.values(n.layout).every(Number.isFinite))'),'Finite scoped desktop geometry');
  // The minimap must preserve proportions and contain every visible card.
  for (const [width, height] of [[284, 120], [264, 120]]) {
    context.mapWidth=width; context.mapHeight=height;
    const bounds = run('minimapDrawingBounds(mapWidth,mapHeight)');
    assert.ok(bounds.width > 0 && bounds.height > 0, 'Minimap has finite positive dimensions');
    context.mapBounds=bounds;
    assert.ok(run('state.visibleNodes.every(n=>n.layout.x>=mapBounds.left && n.layout.x+n.layout.width<=mapBounds.left+mapBounds.width && n.layout.y-n.layout.height/2>=mapBounds.top && n.layout.y+n.layout.height/2<=mapBounds.top+mapBounds.height)'), 'Minimap includes every complete card');
  }
  run('layoutMobile(state.visibleNodes)');
  assert.ok(run('state.visibleNodes.every(n=>Object.values(n.layout).every(Number.isFinite))'),'Finite mobile geometry');
  assert.equal(run('state.scopeRoot.layout.x'),28,'Mobile scope starts at left inset');
}
run('state.scopeRoot=null; state.allNodes.forEach(n=>{n.collapsed=false});');
assert.equal(run('getVisibleNodes().filter(n=>!n.isAnnotation).length'),294,'Full architecture retained');
// Fully expanded minimap: every rectangle is the exact projected card,
// with no minimum-width/height inflation and no false overlaps.
run('state.visibleNodes=getVisibleNodes(); layoutDesktop(state.visibleNodes)');
const fullProjection = run(`(() => {
  const world=minimapDrawingBounds(), sx=284/world.width, sy=120/world.height;
  const mx=x=>(x-world.left)*sx, my=y=>(y-world.top)*sy;
  return state.visibleNodes.map(node=>({id:node.id, source:node.layout,
    rect:minimapNodeRect(node,mx,my,sx,sy), sx,sy}));
})()`);
for (const {source,rect,sx,sy} of fullProjection) {
  assert.ok(Math.abs(rect.width/source.width-sx)<1e-9,'Exact horizontal projection');
  assert.ok(Math.abs(rect.height/source.height-sy)<1e-9,'Exact vertical projection');
}
for (let i=0;i<fullProjection.length;i++) for(let j=i+1;j<fullProjection.length;j++) {
  const a=fullProjection[i].rect,b=fullProjection[j].rect;
  assert.ok(!(a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y),'No overlapping minimap cards in the fully expanded tree');
}
assert.ok(run('searchMatches("fisioterapia").some(n=>n.title === "Fisioterapia")'),'Cross-area search still finds services');
assert.ok(run('searchMatches("retail").some(n=>n.title === "ILUNION Retail")'));
console.log(`PASS: ${records.length} pages preserved; ${scopes.length} scopes; desktop/mobile layout; global search.`);
