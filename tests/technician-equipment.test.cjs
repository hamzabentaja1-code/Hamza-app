const test=require('node:test');
const assert=require('node:assert/strict');
const {createEquipment,updateEquipment,normalizeEquipment}=require('../.test-build/technician-equipment.js');

test('creates and updates categorized equipment with optional technician assignment',()=>{
  const technicians=[4,7];
  const item=createEquipment({name:'Camera tester',category:'Network tools',serialNumber:'SN-01',technicianId:4,status:'مستعمل'},1,[],technicians);
  assert.deepEqual(item,{id:1,name:'Camera tester',category:'Network tools',serialNumber:'SN-01',technicianId:4,status:'مستعمل'});
  const updated=updateEquipment([item],1,{name:'Tester',category:'Electrical',status:'صيانة'},technicians);
  assert.equal(updated[0].category,'Electrical');
  assert.equal(updated[0].technicianId,undefined);
});

test('rejects duplicate serials, missing technician links and malformed records',()=>{
  const item=createEquipment({name:'Meter',category:'Electrical',serialNumber:'M-1',status:'متاح'},1);
  assert.throws(()=>createEquipment({name:'Meter 2',category:'Electrical',serialNumber:'m-1',status:'متاح'},2,[item]),/مسجل من قبل/);
  assert.throws(()=>createEquipment({name:'Meter 2',category:'Electrical',technicianId:99,status:'متاح'},2,[item],[4]),/غير موجود/);
  assert.deepEqual(normalizeEquipment([{...item,id:1},{...item,id:1,name:'Duplicate'},{...item,id:2,technicianId:99},null],[4]),[item]);
});
