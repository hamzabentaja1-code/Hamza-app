const test=require('node:test');
const assert=require('node:assert/strict');
const {
 createSupplierPriceRequest,transitionSupplierPriceRequest,recordSupplierPriceOffer,
 compareSupplierOffers,createSupplierInvoice
}=require('../.test-build/supplier-procurement.js');
const request=(id,supplierId,name)=>createSupplierPriceRequest({
 id,number:'DR-'+id,supplierId,supplierName:name,createdAt:'2026-11-07T09:00:00.000Z',
 lines:[{productId:1,productName:'Cable',quantity:10},{productId:2,productName:'Plug',quantity:5,variantId:'white'}]
});
const quote=(id,cable,plug)=>({id,receivedAt:'2026-11-07T12:00:00.000Z',lines:[
 {productId:1,unitCostCentimes:cable,leadTimeDays:2},
 {productId:2,variantId:'white',unitCostCentimes:plug,leadTimeDays:4}
]});
test('creates a draft supplier price request and validates supplier and lines',()=>{
 const value=request('r1','s1','Supplier A');
 assert.equal(value.status,'draft');assert.equal(value.offers.length,0);
 assert.throws(()=>createSupplierPriceRequest({id:'',number:'x',supplierId:'s',supplierName:'A',createdAt:'2026-11-07',lines:[{productId:1,productName:'Cable',quantity:1}]}));
});
test('enforces supplier price request lifecycle',()=>{
 const sent=transitionSupplierPriceRequest(request('r1','s1','Supplier A'),'sent');
 assert.equal(sent.status,'sent');
 assert.throws(()=>transitionSupplierPriceRequest(sent,'accepted'));
 const quoted=recordSupplierPriceOffer(sent,quote('o1',1200,400));
 assert.equal(quoted.status,'quoted');assert.equal(quoted.offers.length,1);
 assert.equal(transitionSupplierPriceRequest(quoted,'accepted').status,'accepted');
 assert.throws(()=>transitionSupplierPriceRequest(quoted,'sent'));
});
test('records only complete offers for the exact requested product variants',()=>{
 const sent=transitionSupplierPriceRequest(request('r1','s1','Supplier A'),'sent');
 assert.throws(()=>recordSupplierPriceOffer(sent,{id:'o1',receivedAt:'2026-11-07',lines:[{productId:1,unitCostCentimes:100}]}),/غير صالح/);
 assert.throws(()=>recordSupplierPriceOffer(sent,{id:'o1',receivedAt:'2026-11-07',lines:[
  {productId:1,unitCostCentimes:100},{productId:2,variantId:'black',unitCostCentimes:100}
 ]}),/غير صالحة/);
 assert.throws(()=>recordSupplierPriceOffer(request('r2','s2','Supplier B'),quote('o2',100,100)),/إرسال/);
});
test('compares supplier offers per product and variant from lowest to highest',()=>{
 const a=recordSupplierPriceOffer(transitionSupplierPriceRequest(request('r1','s1','Supplier A'),'sent'),quote('o1',1300,500));
 const b=recordSupplierPriceOffer(transitionSupplierPriceRequest(request('r2','s2','Supplier B'),'sent'),quote('o2',1100,600));
 const rows=compareSupplierOffers([a,b]);
 assert.deepEqual(rows.filter(x=>x.productId===1).map(x=>x.supplierName),['Supplier B','Supplier A']);
 assert.equal(rows.find(x=>x.productId===1&&x.supplierId==='s2').lineTotalCentimes,11000);
 assert.equal(rows.find(x=>x.productId===2).variantId,'white');
});
const order={id:8,supplierId:'s1',status:'partially_received',lines:[
 {productId:1,productName:'Cable',quantity:10,receivedQuantity:6},
 {productId:2,variantId:'white',productName:'Plug',quantity:5,receivedQuantity:5}
]};
test('creates supplier invoice only against received purchase-order quantities',()=>{
 const invoice=createSupplierInvoice({id:'i1',number:'FA-1',supplierId:'s1',purchaseOrder:order,issuedAt:'2026-11-07',
  lines:[{productId:1,description:'Cable',quantity:4,unitCostCentimes:1200},{productId:2,variantId:'white',description:'Plug white',quantity:5,unitCostCentimes:400}]});
 assert.equal(invoice.purchaseOrderId,8);assert.equal(invoice.totalCentimes,6800);
});
test('prevents supplier invoice quantities exceeding receipts or duplicate invoices',()=>{
 assert.throws(()=>createSupplierInvoice({id:'i1',number:'FA-1',supplierId:'s1',purchaseOrder:order,issuedAt:'2026-11-07',
  lines:[{productId:1,description:'Cable',quantity:7,unitCostCentimes:1200}]}),/تتجاوز/);
 const first=createSupplierInvoice({id:'i1',number:'FA-1',supplierId:'s1',purchaseOrder:order,issuedAt:'2026-11-07',
  lines:[{productId:1,description:'Cable',quantity:4,unitCostCentimes:1200}]});
 assert.throws(()=>createSupplierInvoice({id:'i2',number:'fa-1',supplierId:'s1',purchaseOrder:order,issuedAt:'2026-11-08',
  lines:[{productId:1,description:'Cable',quantity:1,unitCostCentimes:1200}],previousInvoices:[first]}),/مسجل/);
 assert.throws(()=>createSupplierInvoice({id:'i2',number:'FA-2',supplierId:'s1',purchaseOrder:order,issuedAt:'2026-11-08',
  lines:[{productId:1,description:'Cable',quantity:3,unitCostCentimes:1200}],previousInvoices:[first]}),/تتجاوز/);
});
test('rejects supplier invoice linked to a different supplier or cancelled order',()=>{
 assert.throws(()=>createSupplierInvoice({id:'i1',number:'FA-1',supplierId:'s2',purchaseOrder:order,issuedAt:'2026-11-07',
  lines:[{productId:1,description:'Cable',quantity:1,unitCostCentimes:1200}]}),/غير صالحة/);
 assert.throws(()=>createSupplierInvoice({id:'i1',number:'FA-1',supplierId:'s1',purchaseOrder:{...order,status:'cancelled'},issuedAt:'2026-11-07',
  lines:[{productId:1,description:'Cable',quantity:1,unitCostCentimes:1200}]}),/غير صالحة/);
});

test('supplier procurement variant price inputs use the same composite key for display and save',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../src/SupplierProcurementWorkspace.tsx'),'utf8');
 const key="String(line.productId)+'::'+(line.variantId||'')";
 assert.ok(source.includes("value={prices["+key+"]||''}"));
 assert.ok(source.includes("["+key+"]:value"));
});
