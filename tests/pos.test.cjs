const test = require('node:test');
const assert = require('node:assert/strict');
const {addPosLine, emptyPosCart, findPosProduct, posTotals, validateCheckout} = require('../.test-build/pos.js');

const products = [
  {id:'1', name:'Camera X1', reference:'CAM-X1', barcode:'123456', salePrice:1200, stock:3, trackStock:true},
  {id:'2', name:'Cable HDMI', reference:'CB-HD', barcode:'987654', salePrice:45, stock:20, trackStock:true},
];

test('POS search prioritizes exact barcode and reference before name match', () => {
  assert.equal(findPosProduct(products, '123456').id, '1');
  assert.equal(findPosProduct(products, 'CB-HD').id, '2');
  assert.equal(findPosProduct(products, 'camera').id, '1');
  assert.equal(findPosProduct(products, ''), undefined);
});

test('POS cart adds items and prevents quantities above stock', () => {
  const cart = addPosLine(emptyPosCart(), products[0], 2);
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 2);
  assert.throws(() => addPosLine(cart, products[0], 2), /المخزون غير كافي/);
});

test('POS totals apply line and global discounts without going negative', () => {
  const cart = {
    ...emptyPosCart(),
    lines: [{productId:'1', name:'Camera X1', quantity:2, unitPrice:100, discount:10}],
    globalDiscount:25,
    paymentMethod:'cash',
    paidAmount:175,
  };
  assert.deepEqual(posTotals(cart), {
    subtotal:190, discount:25, total:165, paid:165, remaining:0, change:10,
  });
});

test('POS checkout rejects empty carts and underpaid cash checkouts', () => {
  assert.ok(validateCheckout(emptyPosCart()).includes('السلة فارغة'));
  const cart = {
    ...emptyPosCart(),
    lines: [{productId:'1', name:'Camera X1', quantity:1, unitPrice:100, discount:0}],
    paymentMethod:'cash',
    paidAmount:20,
  };
  assert.ok(validateCheckout(cart).includes('المبلغ المؤدى أقل من المجموع'));
  assert.ok(validateCheckout({...cart, paymentMethod:'credit'}).includes('اختار زبوناً مسجلاً للبيع بالدين'));
});

test('credit checkout requires a registered customer and a valid partial payment',()=>{
  const cart={...emptyPosCart(),lines:[{productId:'1',name:'Cable',quantity:2,unitPrice:10,discount:0}],paymentMethod:'credit',paidAmount:5};
  assert.ok(validateCheckout(cart).includes('اختار زبوناً مسجلاً للبيع بالدين'));
  assert.deepEqual(validateCheckout({...cart,customerId:'7'}),[]);
  assert.ok(validateCheckout({...cart,customerId:'7',paidAmount:25}).includes('المبلغ المؤدى ما صالحش'));
});
