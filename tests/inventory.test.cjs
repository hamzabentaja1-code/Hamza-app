const test = require('node:test');
const assert = require('node:assert/strict');
const {
  warehouseStock, inventoryValue, averageInventoryUnitCost, averageInventoryCostAcrossWarehouses, transferStock, validateStockIssue, validateStockDemand,
  createStockCount, applyStockCount,
} = require('../.test-build/inventory.js');

const base = [
  { id: 'open-1', productId: 'p1', warehouseId: 'w1', kind: 'opening', quantity: 10, unitCost: 20, createdAt: '2026-01-01' },
  { id: 'buy-1', productId: 'p1', warehouseId: 'w1', kind: 'purchase', quantity: 5, unitCost: 30, createdAt: '2026-01-02' },
  { id: 'sale-1', productId: 'p1', warehouseId: 'w1', kind: 'sale', quantity: 3, createdAt: '2026-01-03' },
];

test('stock balance and weighted inventory value remain consistent', () => {
  assert.equal(warehouseStock(base, 'p1', 'w1'), 12);
  assert.equal(inventoryValue(base, 'p1', 'w1'), 280);
  assert.equal(averageInventoryUnitCost(base, 'p1', 'w1'), 280/12);
});

test('average cost distinguishes explicit zero-cost stock from records with no cost history',()=>{
  assert.equal(averageInventoryUnitCost([{id:'free',productId:'p1',warehouseId:'w1',kind:'opening',quantity:2,unitCost:0,createdAt:'2026-01-01'}],'p1','w1'),0);
  assert.equal(averageInventoryUnitCost([{id:'legacy',productId:'p1',warehouseId:'w1',kind:'opening',quantity:2,createdAt:'2026-01-01'}],'p1','w1'),undefined);
});

test('product export cost weights on-hand stock across distinct warehouses',()=>{
  const movements=[...base,{id:'open-w2',productId:'p1',warehouseId:'w2',kind:'opening',quantity:4,unitCost:40,createdAt:'2026-01-01'}];
  assert.equal(averageInventoryCostAcrossWarehouses(movements,'p1',['w1','w2','w2'],10),(280+160)/16);
  assert.equal(averageInventoryCostAcrossWarehouses(movements,'missing',['w1','w2'],7),7);
});

test('manual sales and POS store the active warehouse weighted cost snapshot',()=>{
  const app=require('node:fs').readFileSync('App.tsx','utf8');
  assert.match(app,/unitCost:averageInventoryUnitCost\(stockMovements,String\(p\.id\),activeWarehouseId\)/);
  assert.match(app,/unitCost:averageInventoryUnitCost\(stockMovements,String\(line\.productId\),activeWarehouseId\)/);
});

test('transfer posts paired movements and preserves total stock', () => {
  const next = transferStock({
    id: 'tr-1', productId: 'p1', fromWarehouseId: 'w1',
    toWarehouseId: 'w2', quantity: 4, createdAt: '2026-01-04',
  }, base);
  assert.equal(warehouseStock(next, 'p1', 'w1'), 8);
  assert.equal(warehouseStock(next, 'p1', 'w2'), 4);
  assert.equal(warehouseStock(next, 'p1', 'w1') + warehouseStock(next, 'p1', 'w2'), 12);
  assert.ok(Math.abs(inventoryValue(next, 'p1', 'w1') + inventoryValue(next, 'p1', 'w2') - inventoryValue(base, 'p1', 'w1')) < 1e-8);
  assert.equal(averageInventoryUnitCost(next, 'p1', 'w2'), 280/12);
  assert.throws(() => transferStock({
    id: 'tr-1', productId: 'p1', fromWarehouseId: 'w1',
    toWarehouseId: 'w2', quantity: 1, createdAt: '2026-01-05',
  }, next), /مسجل/);
});

test('stock issue rejects invalid and unavailable quantities', () => {
  assert.match(validateStockIssue(base, 'p1', 'w1', 0) ?? '', /أكبر من صفر/);
  assert.match(validateStockIssue(base, 'p1', 'w1', 99) ?? '', /غير كافي/);
});

test('stock demand aggregates duplicate invoice lines before checking availability',()=>{
  const movements=[{id:'open',productId:'p1',warehouseId:'w1',kind:'opening',quantity:5,createdAt:'2026-11-12'}];
  assert.equal(validateStockDemand(movements,'w1',[{productId:'p1',quantity:2},{productId:'p1',quantity:3}]),null);
  assert.match(validateStockDemand(movements,'w1',[{productId:'p1',quantity:3},{productId:'p1',quantity:3}])??' ',/غير كافي/);
  assert.match(validateStockDemand(movements,'w1',[{productId:'p1',quantity:0}])??' ',/أكبر من صفر/);
});

test('stock count records only differences as auditable adjustments', () => {
  const count = createStockCount({
    id: 'count-1', warehouseId: 'w1', createdAt: '2026-02-01',
    lines: [{ productId: 'p1', countedQuantity: 10 }, { productId: 'p2', countedQuantity: 7 }],
  }, base);
  assert.equal(count.lines[0].expectedQuantity, 12);
  assert.equal(count.lines[0].difference, -2);
  assert.equal(count.lines[1].expectedQuantity, 0);
  assert.equal(count.lines[1].difference, 7);
  const next = applyStockCount(count, base);
  assert.equal(warehouseStock(next, 'p1', 'w1'), 10);
  assert.equal(warehouseStock(next, 'p2', 'w1'), 7);
  assert.equal(next.filter(m => m.stockCountId === 'count-1').length, 2);
  assert.throws(() => applyStockCount(count, next), /تطبق/);
});

test('positive stock counts carry a cost fallback when the warehouse has no cost history',()=>{
  const count=createStockCount({id:'count-cost',warehouseId:'w1',createdAt:'2026-02-03',lines:[{productId:'p2',countedQuantity:7,unitCost:8}]},base);
  const next=applyStockCount(count,base);
  assert.equal(next.find(m=>m.stockCountId==='count-cost')?.unitCost,8);
  assert.equal(inventoryValue(next,'p2','w1'),56);
});

test('stock count rejects duplicate products and negative or invalid counts', () => {
  assert.throws(() => createStockCount({
    id: 'bad-1', warehouseId: 'w1', createdAt: 'now',
    lines: [{ productId: 'p1', countedQuantity: 1 }, { productId: 'p1', countedQuantity: 2 }],
  }, base), /مكرر/);
  assert.throws(() => createStockCount({
    id: 'bad-2', warehouseId: 'w1', createdAt: 'now',
    lines: [{ productId: 'p1', countedQuantity: -1 }],
  }, base), /صفر/);
});

test('a count with no differences is still recorded and cannot be replayed', () => {
  const count = createStockCount({
    id: 'count-empty-diff', warehouseId: 'w1', createdAt: '2026-02-02',
    lines: [{ productId: 'p1', countedQuantity: 12 }],
  }, base);
  const next = applyStockCount(count, base);
  assert.equal(warehouseStock(next, 'p1', 'w1'), 12);
  assert.equal(next.filter(m => m.stockCountId === count.id).length, 1);
  assert.throws(() => applyStockCount(count, next), /تطبق/);
});

test('warehouse normalization preserves unique valid warehouses and always keeps the main warehouse', () => {
  const { normalizeWarehouses } = require('../.test-build/inventory.js');
  const result = normalizeWarehouses([{id:'w2',name:'Depot 2',active:true},{id:'w2',name:'Duplicate',active:true},{id:'',name:'Invalid',active:true},{id:'w3',name:'Depot 3',active:false}]);
  assert.deepEqual(result.map(w=>w.id), ['main','w2','w3']);
  assert.equal(normalizeWarehouses(null)[0].id, 'main');
});

test('warehouse validation rejects missing fields and duplicate identifiers or names', () => {
  const { validateWarehouse } = require('../.test-build/inventory.js');
  const existing = [{id:'main',name:'Main',active:true}];
  assert.match(validateWarehouse({id:'',name:''}, existing).join(' '), /اسم المخزن/);
  assert.match(validateWarehouse({id:'main',name:'Other'}, existing).join(' '), /معرف المخزن/);
  assert.match(validateWarehouse({id:'new',name:'main'}, existing).join(' '), /اسم المخزن/);
});
