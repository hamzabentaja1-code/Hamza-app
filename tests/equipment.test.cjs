const test=require('node:test');
const assert=require('node:assert/strict');
const {validateEquipment}=require('../.test-build/equipment.js');
const equipment=(overrides={})=>({id:'eq1',name:'PoE switch',category:'Network',serial:'SN-01',status:'available',...overrides});
test('equipment requires a name and category and keeps serials unique',()=>{
 assert.deepEqual(validateEquipment(equipment()),[]);
 assert.ok(validateEquipment(equipment({name:'',category:''})).length>=2);
 assert.ok(validateEquipment(equipment(),[equipment()]).some(error=>error.includes('معرف')));
 assert.ok(validateEquipment(equipment({id:'eq2',serial:'sn-01'}),[equipment()]).some(error=>error.includes('التسلسلي')));
});
