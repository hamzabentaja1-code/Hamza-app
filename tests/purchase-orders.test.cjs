const test=require('node:test');
const assert=require('node:assert/strict');
const {createPurchaseOrder,receivePurchaseOrder,cancelPurchaseOrder}=require('../.test-build/purchase-orders.js');
const order=()=>createPurchaseOrder({id:1,supplierName:'Supplier A',createdAt:'2026-11-07T09:00:00.000Z',lines:[
 {productId:10,productName:'Cable',quantity:10,unitCost:12.5},
 {productId:11,productName:'Plug',quantity:5,unitCost:4},
]});
test('creates validated supplier order with unreceived quantities',()=>{
 const value=order();
 assert.equal(value.status,'ordered');
 assert.equal(value.lines[0].receivedQuantity,0);
});
test('supports partial then complete goods receipts',()=>{
 const first=receivePurchaseOrder(order(),{date:'2026-11-07T10:00:00.000Z',lines:[{productId:10,quantity:4}]});
 assert.equal(first.order.status,'partially_received');
 assert.equal(first.order.lines[0].receivedQuantity,4);
 const second=receivePurchaseOrder(first.order,{date:'2026-11-08T10:00:00.000Z',lines:[
  {productId:10,quantity:6},{productId:11,quantity:5}
 ]});
 assert.equal(second.order.status,'received');
 assert.equal(second.remaining,0);
});
test('rejects receipts above outstanding order quantities and unknown products',()=>{
 assert.throws(()=>receivePurchaseOrder(order(),{date:'2026-11-07',lines:[{productId:10,quantity:11}]}),/تتجاوز/);
 assert.throws(()=>receivePurchaseOrder(order(),{date:'2026-11-07',lines:[{productId:99,quantity:1}]}),/غير موجود/);
});
test('rejects duplicate or invalid order lines',()=>{
 assert.throws(()=>createPurchaseOrder({id:2,supplierName:'A',createdAt:'2026-11-07',lines:[
  {productId:1,productName:'A',quantity:2,unitCost:3},{productId:1,productName:'A',quantity:1,unitCost:3}
 ]}));
});
test('cancels unreceived orders only',()=>{
 assert.equal(cancelPurchaseOrder(order()).status,'cancelled');
 const received=receivePurchaseOrder(order(),{date:'2026-11-07',lines:[{productId:10,quantity:10},{productId:11,quantity:5}]}).order;
 assert.throws(()=>cancelPurchaseOrder(received));
});
