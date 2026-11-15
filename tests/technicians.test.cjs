const test=require('node:test');
const assert=require('node:assert/strict');
const {createTechnician,updateTechnician,normalizeTechnicians}=require('../.test-build/technicians.js');

test('creates and updates technician profile with validated rate and unique name',()=>{
  const first=createTechnician({name:'Hamza',phone:'0612345678',specialty:'CCTV',hourlyRate:85.257},1);
  assert.deepEqual(first,{id:1,name:'Hamza',phone:'0612345678',specialty:'CCTV',hourlyRate:85.26});
  assert.throws(()=>createTechnician({name:'hamza',hourlyRate:10},2,[first]),/مسجل من قبل/);
  const updated=updateTechnician([first],1,{name:'Hamza B',hourlyRate:0});
  assert.equal(updated[0].name,'Hamza B');
  assert.equal(updated[0].hourlyRate,0);
});

test('rejects invalid technician profile and normalizes saved records',()=>{
  assert.throws(()=>createTechnician({name:'',hourlyRate:10},1));
  assert.throws(()=>createTechnician({name:'Tech',hourlyRate:-1},1));
  assert.throws(()=>createTechnician({name:'Tech',hourlyRate:10},1,[{id:1,name:'Old',hourlyRate:5}]));
  assert.deepEqual(normalizeTechnicians([{id:1,name:'Tech',hourlyRate:40},{id:1,name:'Duplicate',hourlyRate:30},{id:'bad',name:'Broken',hourlyRate:20},null]),[{id:1,name:'Tech',hourlyRate:40}]);
});
