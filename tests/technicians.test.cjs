const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTechnician}=require('../.test-build/technicians.js');
const tech=(overrides={})=>({id:'tech1',name:'Hamza',phone:'0600000000',specialty:'CCTV',hourlyRateCentimes:15000,active:true,...overrides});
test('technicians require a name, specialty and valid hourly rate',()=>{
  assert.deepEqual(validateTechnician(tech()),[]);
  assert.ok(validateTechnician(tech({name:'',specialty:'',hourlyRateCentimes:-1})).length>=3);
  assert.ok(validateTechnician(tech(),[tech()]).some(error=>error.includes('معرف')));
  assert.ok(validateTechnician(tech({id:'tech2',name:'hamza'}),[tech()]).some(error=>error.includes('مسجل')));
});
