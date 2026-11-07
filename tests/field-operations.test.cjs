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
