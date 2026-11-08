const test=require('node:test');
const assert=require('node:assert/strict');
const {validateInstallationRequest,changeInstallationRequestStatus}=require('../.test-build/installation-requests.js');
const request=(overrides={})=>({id:'ir1',customerId:1,projectId:10,type:'cctv',siteAddress:'Mediouna, lot 96',requestedDate:'2026-11-12',status:'new',createdAt:'2026-11-08T12:00:00.000Z',...overrides});
test('installation request validates customer, site, dates and linked project',()=>{
  assert.deepEqual(validateInstallationRequest(request(),[],[1],[10]),[]);
  assert.ok(validateInstallationRequest(request({siteAddress:'',requestedDate:'2026-02-30'}),[],[2],[11]).length>=3);
  assert.ok(validateInstallationRequest(request(),[request()],[1],[10]).some(error=>error.includes('معرف')));
});
test('installation request status follows a forward workflow and terminal states stay closed',()=>{
  const scheduled=changeInstallationRequestStatus(request(),'scheduled');
  const active=changeInstallationRequestStatus(scheduled,'in_progress');
  assert.equal(changeInstallationRequestStatus(active,'completed').status,'completed');
  assert.throws(()=>changeInstallationRequestStatus(request(),'completed'));
  assert.throws(()=>changeInstallationRequestStatus({...active,status:'completed'},'scheduled'));
});
