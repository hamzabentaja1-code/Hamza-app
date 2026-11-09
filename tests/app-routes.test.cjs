const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('App.tsx','utf8');
test('every dashboard module has an implemented screen route',()=>{
 const start=source.indexOf('const modules = [');
 const end=source.indexOf('];',start);
 assert.ok(start>=0&&end>start,'module registry exists');
 const names=[...source.slice(start,end).matchAll(/ar:'([^']+)'/g)].map(x=>x[1]);
 assert.ok(names.length>=30,'expected HamZa feature modules');
 const routes=new Set([...source.matchAll(/screen===['"]([^'"]+)['"]/g)].map(x=>x[1]));
 for(const name of names)assert.ok(routes.has(name),'dashboard tile has no screen route: '+name);
});
test('unknown screen falls back to a working home navigation, never a demo screen',()=>{
 assert.doesNotMatch(source,/الواجهة الأولية موجودة|الوظائف التفصيلية لهذا القسم مازال ما تبرمجاتش/);
 assert.match(source,/قسم غير متوفر/);
 assert.match(source,/onPress=\{\(\)=>go\('الرئيسية'\)\} style=\{s\.action\}/);
});
