const test=require('node:test');
const assert=require('node:assert/strict');
const {createParkedPosSale,normalizeParkedPosSales}=require('../.test-build/domain/pos-parked-sales.js');

const sale=(changes={})=>({
  title:'Commande téléphone',
  cart:{customerId:'4',lines:[{productId:'10',name:'Caméra',quantity:2,unitPrice:300,discount:10}],globalDiscount:20,paymentMethod:'credit',paidAmount:100},
  customerId:'4',method:'credit',bankAccountId:'bank-1',creditPaymentMethod:'transfer',creditPaidText:'100',discountText:'20',
  ...changes,
});

test('parks the whole cart and restores payment choices without changing totals',()=>{
  const parked=createParkedPosSale(sale(),'parked-1','2026-11-15T12:00:00.000Z');
  assert.equal(parked.cart.lines[0].quantity,2);
  assert.equal(parked.cart.globalDiscount,20);
  assert.equal(parked.customerId,'4');
  assert.equal(parked.bankAccountId,'bank-1');
  assert.equal(normalizeParkedPosSales([parked])[0].creditPaidText,'100');
});

test('rejects empty carts and invalid parked sale identity',()=>{
  assert.throws(()=>createParkedPosSale(sale({cart:{...sale().cart,lines:[]}}),'parked-1','2026-11-15T12:00:00Z'));
  assert.throws(()=>createParkedPosSale(sale(),'','2026-11-15T12:00:00Z'));
  assert.throws(()=>createParkedPosSale(sale(),'parked-1','invalid-date'));
});

test('normalization ignores malformed entries and caps parked sales at fifty',()=>{
  const valid=createParkedPosSale(sale(),'parked-1','2026-11-15T12:00:00Z');
  assert.equal(normalizeParkedPosSales([null,{...valid,cart:{...valid.cart,lines:[{...valid.cart.lines[0],quantity:-1}]}},valid]).length,1);
  const many=Array.from({length:60},(_,i)=>({...valid,id:`parked-${i}`}));
  assert.equal(normalizeParkedPosSales(many).length,50);
});

const {saveParkedPosSale,parkedCheckoutError}=require('../.test-build/domain/pos-parked-sales.js');
const time='2026-11-28T16:00:00Z';
const roundTrip=value=>normalizeParkedPosSales(JSON.parse(JSON.stringify(value)));

test('resuming and changing screen never consume the durable sale; re-park updates the same row',()=>{
  const first=createParkedPosSale(sale({warehouseId:'A'}),'parked-1',time);
  const saved=saveParkedPosSale([],first,false);
  const opened=roundTrip(saved)[0];
  const edited=createParkedPosSale({...opened,discountText:'35',cart:{...opened.cart,globalDiscount:35}},opened.id,time);
  assert.equal(roundTrip(saved)[0].discountText,'20');
  const reparked=roundTrip(saveParkedPosSale(saved,edited,true));
  assert.equal(reparked.length,1);
  assert.equal(reparked[0].id,first.id);
  assert.equal(reparked[0].warehouseId,'A');
  assert.equal(reparked[0].discountText,'35');
  assert.equal(reparked[0].customerId,'4');
  assert.throws(()=>saveParkedPosSale(saved,first,false),/ما بقاش متاح/);
});

test('parked checkout is depot-bound and old drafts require explicit depot confirmation',()=>{
  const current=createParkedPosSale(sale({warehouseId:'A'}),'bound',time);
  const old=createParkedPosSale(sale(),'legacy',time);
  const rows=roundTrip([current,old]);
  assert.equal(rows[1].warehouseId,undefined);
  assert.match(parkedCheckoutError(rows,'B',{warehouseId:'A',parkedSaleId:'bound'}),/بمخزن آخر/);
  assert.match(parkedCheckoutError(rows,'B',{warehouseId:'B',parkedSaleId:'bound'}),/بمخزن آخر/);
  assert.equal(parkedCheckoutError(rows,'A',{warehouseId:'A',parkedSaleId:'bound'}),undefined);
  assert.equal(rows.length,2);
  assert.match(parkedCheckoutError(rows,'B',{warehouseId:'B',parkedSaleId:'legacy'}),/اختار المخزن/);
  assert.equal(parkedCheckoutError(rows,'B',{warehouseId:'B',parkedSaleId:'legacy',legacyWarehouseConfirmed:true}),undefined);
  assert.throws(()=>saveParkedPosSale(rows,{...current,warehouseId:'B'},true),/بمخزن آخر/);
  assert.match(parkedCheckoutError(rows.slice(1),'A',{warehouseId:'A',parkedSaleId:'bound'}),/ما بقاش متاح/);
});

test('the 50-draft cap does not prevent replacing a draft or silently discard another draft',()=>{
  const original=createParkedPosSale(sale({warehouseId:'A'}),'parked',time);
  const rows=Array.from({length:50},(_,i)=>({...original,id:String(i)}));
  assert.throws(()=>saveParkedPosSale(rows,original,false),/حيد بعض المبيعات/);
  const replaced=saveParkedPosSale(rows,{...rows[11],discountText:'35'},true);
  assert.equal(replaced.length,50);
  assert.equal(replaced[0].id,'11');
  assert.equal(replaced[0].discountText,'35');
});
