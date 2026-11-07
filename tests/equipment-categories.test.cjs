const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeEquipmentCategories,addEquipmentCategory}=require('../.test-build/equipment-categories.js');
test('equipment categories normalize whitespace, duplicates and malformed saved values',()=>{
 assert.deepEqual(normalizeEquipmentCategories(['  Pompe  ','pompe','Climatisation',null,7,'']),['Pompe','Climatisation']);
 assert.deepEqual(normalizeEquipmentCategories('not-an-array'),[]);
});
test('equipment categories reject empty, oversized and duplicate names',()=>{
 assert.deepEqual(addEquipmentCategory(['Pompe'],'Climatisation'),['Pompe','Climatisation']);
 assert.throws(()=>addEquipmentCategory(['Pompe'],' pompe '),/موجودة/);
 assert.throws(()=>addEquipmentCategory([],''),/مطلوب/);
 assert.throws(()=>addEquipmentCategory([],'x'.repeat(49)),/48/);
});
