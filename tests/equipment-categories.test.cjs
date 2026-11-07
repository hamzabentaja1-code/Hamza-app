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

test('equipment category dictionary is persisted, backed up, restored and wired to equipment editor',()=>{
 const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const workspace=fs.readFileSync(path.join(root,'src','FieldOperationsWorkspace.tsx'),'utf8');
 assert.match(app,/equipmentCategories,setEquipmentCategories/);
 assert.match(app,/normalizeEquipmentCategories\(d\.equipmentCategories\)/);
 assert.match(app,/writeAppData\(\{[\s\S]*?equipment,equipmentCategories,workOrders/);
 assert.match(app,/createBackup\(\{[\s\S]*?equipment,equipmentCategories,workOrders/);
 assert.match(app,/onAddEquipmentCategory=\{name=>setEquipmentCategories/);
 assert.match(app,/onDeleteEquipmentCategory=\{name=>/);
 assert.match(workspace,/equipmentCategories\.map\(category/);
 assert.match(workspace,/category:equipmentCategory\|\|undefined/);
 assert.match(workspace,/onAddEquipmentCategory\(equipmentCategoryDraft\)/);
});
