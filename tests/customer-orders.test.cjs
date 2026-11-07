const test=require('node:test');const assert=require('node:assert/strict');
const {createCustomerOrder,createCustomerOrderFromQuote,changeCustomerOrderStatus,fulfillCustomerOrder,linkCustomerOrderDocument}=require('../.test-build/customer-orders.js');
const base=()=>createCustomerOrder({id:1,number:'CMD-2026-0001',customerName:'Client',date:'2026-11-07',total:250,sourceQuoteId:22,notes:'Urgent',lines:[
 {productId:7,productName:'Cable',qty:2,unitPrice:100,fulfilledQty:0,trackStock:true},
 {productId:8,productName:'Installation',qty:1,unitPrice:50,fulfilledQty:0,trackStock:false}
]});
test('customer order is created from validated immutable line snapshots',()=>{
 const order=base();assert.equal(order.status,'draft');assert.equal(order.total,250);assert.deepEqual(order.deliveryDocumentIds,[]);assert.deepEqual(order.invoiceDocumentIds,[]);assert.equal(order.lines[0].fulfilledQty,0);
});
test('customer order validates totals, quantities and identifiers',()=>{
 assert.throws(()=>createCustomerOrder({id:0,number:'X',customerName:'Client',date:'2026-11-07',total:10,lines:[{productId:1,productName:'X',qty:1,unitPrice:10,fulfilledQty:0}]}));
 assert.throws(()=>createCustomerOrder({id:1,number:'X',customerName:'Client',date:'2026-11-07',total:11,lines:[{productId:1,productName:'X',qty:1,unitPrice:10,fulfilledQty:0}]}),/مجموع/);
 assert.throws(()=>createCustomerOrder({id:1,number:'X',customerName:'Client',date:'2026-11-07',total:10,lines:[{productId:1,productName:'X',qty:0,unitPrice:10,fulfilledQty:0}]}),/سطر/);
});
test('quote conversion preserves document discounts and line-level discounted totals',()=>{
 const quote={id:77,number:'DEV-77',customerName:'Client',productName:'Cable, Adapter',qty:2,unitPrice:0,total:190,documentDiscount:10,lines:[
  {productId:7,productName:'Cable',qty:1,unitPrice:100,total:100,trackStock:true},
  {productId:8,productName:'Adapter',qty:1,unitPrice:100,total:100,trackStock:true}
 ]};
 const order=createCustomerOrderFromQuote(quote,77,'CMD-77','2026-11-07');
 assert.equal(order.total,190);
 assert.equal(order.lines.reduce((sum,line)=>sum+line.qty*line.unitPrice,0),190);
 assert.equal(order.lines[0].unitPrice,95);
 assert.equal(order.lines[1].unitPrice,95);
});
test('order confirmation and cancellation enforce lifecycle rules',()=>{
 const order=base(),confirmed=changeCustomerOrderStatus(order,'confirmed');assert.equal(confirmed.status,'confirmed');
 assert.throws(()=>changeCustomerOrderStatus(order,'fulfilled'),/عملية التسليم/);
 const cancelled=changeCustomerOrderStatus(order,'cancelled');assert.equal(cancelled.status,'cancelled');
 assert.throws(()=>changeCustomerOrderStatus(cancelled,'confirmed'),/مغلق/);
});
test('partial deliveries accumulate and full delivery closes the order',()=>{
 const confirmed=changeCustomerOrderStatus(base(),'confirmed');
 const partial=fulfillCustomerOrder(confirmed,{'0':1,'1':0},500);
 assert.equal(partial.status,'partially_fulfilled');assert.equal(partial.lines[0].fulfilledQty,1);
 const complete=fulfillCustomerOrder(partial,{'0':1,'1':1},501);
 assert.equal(complete.status,'fulfilled');assert.deepEqual(complete.deliveryDocumentIds,[500,501]);
 assert.throws(()=>fulfillCustomerOrder(complete,{'0':1},502),/أكد الطلب/);
});
test('fulfillment rejects excess, duplicate documents and empty deliveries',()=>{
 const confirmed=changeCustomerOrderStatus(base(),'confirmed');
 assert.throws(()=>fulfillCustomerOrder(confirmed,{'0':3},501),/الكمية المتبقية/);
 assert.throws(()=>fulfillCustomerOrder(confirmed,{},501),/واحدة على الأقل/);
 const partial=fulfillCustomerOrder(confirmed,{'0':1},501);
 assert.throws(()=>fulfillCustomerOrder(partial,{'0':1},501),/مكرر/);
});
test('invoice and delivery documents link once and only to their source order',()=>{
 const confirmed=changeCustomerOrderStatus(base(),'confirmed');
 const delivered=fulfillCustomerOrder(confirmed,{'0':2,'1':1},699);
 const linked=linkCustomerOrderDocument(delivered,{id:700,type:'invoice',sourceOrderId:1});
 assert.deepEqual(linked.invoiceDocumentIds,[700]);
 assert.throws(()=>linkCustomerOrderDocument(linked,{id:700,type:'invoice',sourceOrderId:1}),/مسبقاً/);
 assert.throws(()=>linkCustomerOrderDocument(base(),{id:701,type:'invoice',sourceOrderId:1}),/قبل إصدار الفاتورة/);
 assert.throws(()=>linkCustomerOrderDocument(base(),{id:701,type:'delivery',sourceOrderId:9}),/لا تخص/);
});

test('customer orders are wired to quotes, invoice/delivery records, backup and translated accessible workspace',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 const workspace=fs.readFileSync(path.join(__dirname,'..','src','CustomerOrdersWorkspace.tsx'),'utf8');
 const i18n=fs.readFileSync(path.join(__dirname,'..','src','i18n.tsx'),'utf8');
 assert.match(app,/createOrderFromQuote/);
 assert.match(app,/fulfillCustomerOrder\(order,quantities,Date\.now\(\)\)/);
 assert.match(app,/linkCustomerOrderDocument\(nextOrder/);
 assert.match(app,/customerOrders,/, 'orders are included in local persistence and backup payloads');
 assert.match(app,/setCustomerOrders\(Array\.isArray\(d\.customerOrders\)/);
 assert.match(app,/screen==='طلبات الزبناء'/);
 assert.match(workspace,/AccessiblePressable/);
 assert.match(workspace,/TTextInput as TextInput/);
 assert.match(workspace,/onDeliver\(order,values\)/);
 for(const key of ['طلبات الزبناء','إنشاء طلب من عرض سعر مقبول','تأكيد الطلب','تسجيل التسليم','إنشاء فاتورة'])assert.ok(i18n.includes('"'+key+'"'), 'missing French translation '+key);
});
