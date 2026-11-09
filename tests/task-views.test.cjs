const test=require('node:test');
const assert=require('node:assert/strict');
const {saveWorkTaskView,normalizeSavedWorkTaskViews,removeSavedWorkTaskView,MAX_SAVED_WORK_TASK_VIEWS}=require('../.test-build/task-views.js');

const view=(id,name,overrides={})=>({id,name,filters:{query:'',status:'all',priority:'all',projectId:'all',...overrides}});

test('saved task views validate filters and preserve immutable snapshots',()=>{
 const source=[view('v1','مهامي',{query:'  مكالمة  ',status:'open',priority:'high',projectId:4})];
 const saved=saveWorkTaskView([],source[0]);
 assert.deepEqual(saved[0],{id:'v1',name:'مهامي',filters:{query:'مكالمة',status:'open',priority:'high',projectId:4}});
 source[0].filters.query='changed';
 assert.equal(saved[0].filters.query,'مكالمة');
 assert.equal(normalizeSavedWorkTaskViews(JSON.parse(JSON.stringify(saved)))[0].filters.projectId,4);
});

test('saved task views reject duplicates, invalid values and excess records',()=>{
 assert.throws(()=>saveWorkTaskView([],view('v','',{})),/غير صالحة/);
 assert.throws(()=>saveWorkTaskView([],view('v','bad',{status:'waiting'})),/غير صالحة/);
 assert.throws(()=>saveWorkTaskView([],view('v','bad',{priority:'urgent'})),/غير صالحة/);
 assert.throws(()=>saveWorkTaskView([],view('v','bad',{projectId:0})),/غير صالحة/);
 assert.throws(()=>saveWorkTaskView([view('a','التأخير')],view('b','التأخير')),/بهذا الاسم/);
 const many=Array.from({length:MAX_SAVED_WORK_TASK_VIEWS},(_,i)=>view('v'+i,'View '+i));
 assert.throws(()=>saveWorkTaskView(many,view('extra','Extra')),/الحد الأقصى/);
});

test('saved task view updates keep a single entry and removal is safe',()=>{
 let views=saveWorkTaskView([],view('one','الكل'));
 views=saveWorkTaskView(views,view('one','المتأخر',{status:'overdue'}));
 assert.equal(views.length,1);
 assert.equal(views[0].name,'المتأخر');
 assert.equal(views[0].filters.status,'overdue');
 assert.deepEqual(removeSavedWorkTaskView(views,'one'),[]);
 assert.deepEqual(removeSavedWorkTaskView(views,'missing'),views);
});

test('saved task view recovery drops malformed, duplicate and over-limit data',()=>{
 const valid=Array.from({length:MAX_SAVED_WORK_TASK_VIEWS+2},(_,i)=>view('v'+i,'Saved '+i));
 const recovered=normalizeSavedWorkTaskViews([...valid,{...valid[0],id:'duplicate-id'},{...valid[1],filters:{...valid[1].filters,query:'x'.repeat(121)}},null]);
 assert.equal(recovered.length,MAX_SAVED_WORK_TASK_VIEWS);
 assert.equal(recovered.at(-1).name,'Saved '+(MAX_SAVED_WORK_TASK_VIEWS-1));
});


test('task views are saved, restored and applied by the Projects screen in Arabic and French',()=>{
 const fs=require('node:fs');
 const app=fs.readFileSync('App.tsx','utf8');
 const dictionary=fs.readFileSync('src/i18n.tsx','utf8');
 assert.match(app,/normalizeSavedWorkTaskViews\(d\.workTaskViews\)/g);
 assert.match(app,/workTaskViews:savedTaskViews/);
 assert.match(app,/savedTaskViews,recurringExpenseRules/);
 assert.match(app,/saveWorkTaskView\(savedTaskViews,view\)/);
 assert.match(app,/removeSavedTaskView\(current,view\.id\)/);
 assert.match(app,/applySavedTaskView=\(view:SavedWorkTaskView\)=>\{setTaskListQuery/);
 assert.match(app,/savedTaskViews\.map\(view=>/);
 for(const label of ['العروض المحفوظة للمهام','اسم العرض الجديد','حفظ العرض الحالي','حذف العرض؟'])assert.ok(dictionary.includes(JSON.stringify(label)+':'),label+' needs a French translation');
});
