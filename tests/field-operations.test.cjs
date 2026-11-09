const test=require('node:test');const assert=require('node:assert/strict');
const {createWorkOrder,transitionWorkOrderStatus,createWorkTimeEntry,workOrderTimeCost,workOrderHours,technicianTimeCost,technicianCanPerform}=require('../.test-build/field-operations.js');
const tech={id:'tech1',name:'تقني',hourlyRate:80,active:true};
const equip={id:'eq1',name:'مضخة',status:'available'};
const order={id:'wo1',number:'WO-001',title:'تركيب مضخة',customerName:'زبون',description:'تركيب',status:'requested',priority:'normal',equipmentIds:['eq1'],createdAt:'2026-11-07T08:00:00.000Z'};
test('work order validates technician and available equipment',()=>{
 const created=createWorkOrder({...order,technicianId:'tech1'},[tech],[equip]);assert.equal(created.number,'WO-001');
 assert.throws(()=>createWorkOrder({...order,equipmentIds:['missing']},[tech],[equip]),/غير موجودة/);
 assert.throws(()=>createWorkOrder({...order,technicianId:'missing'},[tech],[equip]),/غير موجود/);
});
test('work order status follows a guarded lifecycle',()=>{
 let current=transitionWorkOrderStatus(order,'scheduled');current=transitionWorkOrderStatus(current,'in_progress');current=transitionWorkOrderStatus(current,'completed');
 assert.throws(()=>transitionWorkOrderStatus(current,'in_progress'),/غير مسموح/);
 assert.throws(()=>transitionWorkOrderStatus({...order,status:'requested'},'completed'),/غير مسموح/);
});
test('work time entries calculate hours and cost in centimes',()=>{
 const active=transitionWorkOrderStatus(transitionWorkOrderStatus(order,'scheduled'),'in_progress');
 const entry=createWorkTimeEntry({id:'time1',workOrderId:'wo1',technicianId:'tech1',date:'2026-11-07T10:00:00.000Z',hours:2.5,hourlyRate:80},active,tech);
 assert.equal(entry.costCentimes,20000);assert.equal(workOrderTimeCost([entry],'wo1'),20000);assert.equal(workOrderHours([entry],'wo1'),2.5);assert.equal(technicianTimeCost([entry],'tech1'),20000);
 assert.throws(()=>createWorkTimeEntry({id:'bad',workOrderId:'wo1',technicianId:'tech1',date:'bad',hours:2,hourlyRate:80},active,tech),/غير صالحة/);
 assert.throws(()=>createWorkTimeEntry({id:'too-long',workOrderId:'wo1',technicianId:'tech1',date:'2026-11-07',hours:25,hourlyRate:80},active,tech),/غير صالحة/);
});

test('technician work-type permissions restrict assignment to matching work orders',()=>{
 const installer={...tech,permissions:['installation']};
 assert.equal(technicianCanPerform(installer,'installation'),true);
 assert.equal(technicianCanPerform(installer,'repair'),false);
 assert.equal(technicianCanPerform(tech,'repair'),true);
 assert.throws(()=>createWorkOrder({...order,technicianId:'tech1',category:'repair'},[installer],[equip]),/غير مخول/);
 assert.equal(createWorkOrder({...order,technicianId:'tech1',category:'installation'},[installer],[equip]).category,'installation');
});
test('technician permissions are configurable in the field operations workspace',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const workspace=fs.readFileSync(path.join(__dirname,'..','src','FieldOperationsWorkspace.tsx'),'utf8');
 assert.match(workspace,/permissions:\[\.\.\.techPermissions\]/);
 assert.match(workspace,/technicianCanPerform\(x,orderCategory\)/);
 assert.match(workspace,/category:orderCategory/);
 assert.match(workspace,/WORK_ORDER_CATEGORIES\.map/);
});

test('time entries enforce the assigned technician and category permission',()=>{
 const active={...transitionWorkOrderStatus(transitionWorkOrderStatus(order,'scheduled'),'in_progress'),technicianId:'tech1',category:'repair'};
 const installer={...tech,permissions:['installation']};
 assert.throws(()=>createWorkTimeEntry({id:'time-denied',workOrderId:'wo1',technicianId:'tech1',date:'2026-11-07',hours:1,hourlyRate:80},active,installer),/غير مخول/);
 const allowed={...active,category:'installation'};
 assert.throws(()=>createWorkTimeEntry({id:'time-other',workOrderId:'wo1',technicianId:'tech2',date:'2026-11-07',hours:1,hourlyRate:80},{...allowed,technicianId:'tech1'},{...tech,id:'tech2'}),/غير مخول/);
});


test('work order settlement tracks partial and final payments in integer centimes',()=>{
 const {summarizeWorkOrderSettlement,addWorkOrderSettlementPayment}=require('../.test-build/field-operations.js');
 let settlement=summarizeWorkOrderSettlement(125050,[]);
 assert.equal(settlement.status,'unpaid');assert.equal(settlement.balanceCentimes,125050);
 settlement=addWorkOrderSettlementPayment(settlement,{id:'pay-1',amountCentimes:50000,date:'2026-11-07',method:'cash'});
 assert.equal(settlement.status,'partial');assert.equal(settlement.paidCentimes,50000);assert.equal(settlement.balanceCentimes,75050);
 settlement=addWorkOrderSettlementPayment(settlement,{id:'pay-2',amountCentimes:75050,date:'2026-11-08',method:'transfer'});
 assert.equal(settlement.status,'settled');assert.equal(settlement.balanceCentimes,0);
});
test('work order settlement rejects duplicate, invalid and excessive payments without changing prior state',()=>{
 const {summarizeWorkOrderSettlement,addWorkOrderSettlementPayment}=require('../.test-build/field-operations.js');
 const current=summarizeWorkOrderSettlement(10000,[{id:'p1',amountCentimes:4000,date:'2026-11-07',method:'cash'}]);
 assert.throws(()=>addWorkOrderSettlementPayment(current,{id:'p1',amountCentimes:1000,date:'2026-11-07',method:'cash'}));
 assert.throws(()=>addWorkOrderSettlementPayment(current,{id:'p2',amountCentimes:6001,date:'2026-11-07',method:'cash'}),/تجاوز/);
 assert.throws(()=>addWorkOrderSettlementPayment(current,{id:'p3',amountCentimes:100,date:'bad',method:'cash'}));
 assert.equal(current.paidCentimes,4000);
 assert.throws(()=>summarizeWorkOrderSettlement(1000,[{id:'p',amountCentimes:1001,date:'2026-11-07',method:'cash'}]),/تجاوز/);
});

test('work-order photo evidence survives order changes and remains backed up with the order',()=>{
 const {addWorkOrderEvidence,removeWorkOrderEvidence,normalizeWorkOrderEvidence,MAX_WORK_ORDER_EVIDENCE}=require('../.test-build/field-operations.js');
 const photo=n=>({id:'photo-'+n,dataUri:'data:image/jpeg;base64,AA==',createdAt:'2026-11-09T09:00:00.000Z',caption:'Après installation '+n});
 let current={...order};
 for(let i=1;i<=MAX_WORK_ORDER_EVIDENCE;i++)current=addWorkOrderEvidence(current,photo(i));
 assert.equal(current.evidence.length,4);
 assert.equal(normalizeWorkOrderEvidence(JSON.parse(JSON.stringify(current)).evidence).length,4);
 assert.deepEqual(normalizeWorkOrderEvidence(undefined),[]);
 assert.throws(()=>addWorkOrderEvidence(current,photo(5)),/أربع صور/);
 const next=transitionWorkOrderStatus(current,'scheduled');
 assert.equal(next.evidence.length,4);
 const removed=removeWorkOrderEvidence(next,'photo-2');
 assert.deepEqual(removed.evidence.map(x=>x.id),['photo-1','photo-3','photo-4']);
 assert.equal(current.evidence.length,4);
 assert.throws(()=>removeWorkOrderEvidence(removed,'not-found'),/غير موجودة/);
});
test('work-order evidence blocks invalid formats, oversize data and duplicate image identifiers',()=>{
 const {addWorkOrderEvidence,normalizeWorkOrderEvidence}=require('../.test-build/field-operations.js');
 const original={id:'valid',dataUri:'data:image/png;base64,AAAA',createdAt:'2026-11-09'};
 assert.deepEqual(normalizeWorkOrderEvidence([original,{...original,id:'duplicate',dataUri:'data:text/html;base64,AAAA'},original]).map(x=>x.id),['valid']);
 assert.throws(()=>addWorkOrderEvidence(order,{...original,dataUri:'data:text/html;base64,AAAA'}),/غير صالحة/);
 assert.throws(()=>addWorkOrderEvidence(order,{...original,dataUri:'data:image/jpeg;base64,'+'A'.repeat(1500001)}),/غير صالحة/);
 assert.throws(()=>addWorkOrderEvidence({...order,evidence:[original]},original),/مسجلة/);
 assert.throws(()=>addWorkOrderEvidence(order,{...original,createdAt:'bad'}),/غير صالحة/);
 assert.throws(()=>addWorkOrderEvidence(order,{...original,caption:'x'.repeat(161)}),/غير صالحة/);
 assert.deepEqual(normalizeWorkOrderEvidence([original,{...original,id:'valid'}]).length,1);
});
test('photo buttons are wired to persisted work-order updates and confirmation',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('src/FieldOperationsWorkspace.tsx','utf8');
 assert.match(source,/onChangeOrder\(addWorkOrderEvidence\(order,file\)\)/);
 assert.match(source,/removeWorkOrderEvidence\(order,file\.id\)/);
 assert.match(source,/launchCameraAsync\(/);
 assert.match(source,/launchImageLibraryAsync\(/);
 assert.match(source,/normalizeWorkOrderEvidence\(order\.evidence\)/);
});
