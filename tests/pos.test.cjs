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
  assert.deepEqual(validateCheckout({...cart, paymentMethod:'credit'}), []);
});

test('POS accepts service lines without stock tracking', () => {
  const service={id:'service-1',name:'Installation',salePrice:300,stock:0,trackStock:false};
  const cart=addPosLine(emptyPosCart(),service,3);
  assert.equal(cart.lines[0].quantity,3);
  assert.equal(cart.lines[0].unitPrice,300);
});


test('POS keeps source product and variant identity on cart lines', () => {
  const variant = {id:'42::blue-xl', productId:42, variantId:'blue-xl', variantLabel:'أزرق / XL', name:'T-shirt • أزرق / XL', salePrice:199, stock:4, trackStock:true};
  const cart = addPosLine(emptyPosCart(), variant, 2);
  assert.equal(cart.lines[0].productId, '42::blue-xl');
  assert.equal(cart.lines[0].sourceProductId, 42);
  assert.equal(cart.lines[0].variantId, 'blue-xl');
  assert.equal(cart.lines[0].variantLabel, 'أزرق / XL');
  assert.throws(() => addPosLine(cart, variant, 3), /المخزون غير كافي/);
});

test('POS treats each variant as a separate stock item', () => {
  const blue = {id:'42::blue', productId:42, variantId:'blue', name:'T-shirt blue', salePrice:100, stock:2, trackStock:true};
  const red = {id:'42::red', productId:42, variantId:'red', name:'T-shirt red', salePrice:110, stock:5, trackStock:true};
  const cart = addPosLine(addPosLine(emptyPosCart(), blue, 2), red, 4);
  assert.equal(cart.lines.length, 2);
  assert.equal(cart.lines[0].variantId, 'blue');
  assert.equal(cart.lines[1].variantId, 'red');
});

test('camera barcode scanning is connected to the product editor and POS exact barcode lookup',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const root=path.join(__dirname,'..');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const pos=fs.readFileSync(path.join(root,'src','PosWorkspace.tsx'),'utf8');
 const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.ok(pkg.dependencies['expo-camera']);
 assert.ok(config.expo.plugins.some(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-camera'));
 assert.ok(app.includes('useCameraPermissions'));
 assert.ok(app.includes('barcodeScannerSettings={{barcodeTypes:'));
 assert.match(app,/openBarcodeScanner\(['\"]product['\"]\)/);
 assert.ok(app.includes("openBarcodeScanner('pos')"));
 assert.ok(app.includes("openBarcodeScanner('sale')"));
 assert.ok(app.includes("openBarcodeScanner('purchase')"));
 assert.ok(app.includes('setSaleProduct(String(found.id))'));
 assert.ok(app.includes('setPurchaseProduct(String(found.id))'));
 assert.ok(app.includes('setProductBarcode(code)'));
 assert.ok(pos.includes('findPosProduct(mapped,scannedBarcode)'));
 assert.ok(pos.includes("p.barcode?.toLocaleLowerCase()===q"));
});

test('POS stock filters distinguish available, low, out-of-stock and service items and retain categories',()=>{
 const {filterPosProducts}=require('../.test-build/pos.js');
 const products=[
  {id:'a',name:'A',category:'معدات',stock:12,trackStock:true},
  {id:'b',name:'B',category:'معدات',stock:3,trackStock:true},
  {id:'c',name:'C',category:'معدات',stock:0,trackStock:true},
  {id:'d',name:'D',category:'خدمات',trackStock:false},
 ];
 assert.deepEqual(filterPosProducts(products,'','available').map(x=>x.id),['a','b','d']);
 assert.deepEqual(filterPosProducts(products,'','low').map(x=>x.id),['b']);
 assert.deepEqual(filterPosProducts(products,'','out').map(x=>x.id),['c']);
 assert.deepEqual(filterPosProducts(products,'','services').map(x=>x.id),['d']);
 assert.deepEqual(filterPosProducts(products,'معدات','all').map(x=>x.id),['a','b','c']);
 assert.deepEqual(filterPosProducts(products,'معدات','available').map(x=>x.id),['a','b']);
});
test('POS workspace exposes working stock and category filters without changing barcode lookup',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const workspace=fs.readFileSync(path.join(__dirname,'..','src','PosWorkspace.tsx'),'utf8');
 assert.match(workspace,/filterPosProducts\(mapped,categoryFilter,stockFilter\)/);
 assert.match(workspace,/setStockFilter\(item\.key\)/);
 assert.match(workspace,/setCategoryFilter\(categoryFilter===category\?'':category\)/);
 assert.match(workspace,/findPosProduct\(mapped,scannedBarcode\)/);
});
