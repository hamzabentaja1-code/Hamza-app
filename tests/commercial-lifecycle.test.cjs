const test=require('node:test');
const assert=require('node:assert/strict');
const {changeTrackedSalesDocumentStatus}=require('../.test-build/domain/commercial-lifecycle.js');

test('proformas and customer orders follow allowed status transitions',()=>{
  assert.equal(changeTrackedSalesDocumentStatus({type:'proforma',status:'أولية',sourceQuoteId:1},'مقبولة',false).status,'مقبولة');
  assert.equal(changeTrackedSalesDocumentStatus({type:'customer_order',status:'مؤكد',sourceQuoteId:1},'قيد التجهيز',false).status,'قيد التجهيز');
  assert.throws(()=>changeTrackedSalesDocumentStatus({type:'customer_order',status:'جاهز',sourceQuoteId:1},'مسلم',false),/سند الخروج/);
  assert.equal(changeTrackedSalesDocumentStatus({type:'customer_order',status:'جاهز',sourceQuoteId:1},'مسلم',true).status,'مسلم');
  assert.throws(()=>changeTrackedSalesDocumentStatus({type:'proforma',status:'مرفوضة',sourceQuoteId:1},'مقبولة',false),/غير مسموح/);
});
