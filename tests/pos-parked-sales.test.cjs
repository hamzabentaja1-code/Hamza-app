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
