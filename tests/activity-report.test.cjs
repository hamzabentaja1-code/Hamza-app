const test=require('node:test');
const assert=require('node:assert/strict');
const {buildActivityReportRows}=require('../.test-build/domain/activity-report.js');

test('builds one report table for filtered sales, returns, purchases, expenses and settlements',()=>{
  const rows=buildActivityReportRows({
    sales:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:2,total:500}],
    returns:[{date:'15/11/2026',customerName:'Client A',productName:'Caméra',qty:1,total:250}],
    purchases:[{date:'15/11/2026',supplierName:'Fournisseur B',productName:'Caméra',qty:5,total:800}],
    expenses:[{date:'15/11/2026',title:'Transport',category:'Déplacements',amount:40}],
    customerPayments:[{date:'15/11/2026',customerName:'Client A',amount:100,method:'نقداً',note:'Acompte'}],
    supplierPayments:[{date:'15/11/2026',supplierName:'Fournisseur B',amount:200,method:'تحويل',reference:'R-2'},{date:'15/11/2026',supplierName:'Fournisseur B',amount:50,method:'إشعار دائن',reference:'AV-3'}],
  });
  assert.equal(rows.length,7);
  assert.deepEqual(rows[1],['15/11/2026','Avoir','Client A','Caméra',1,-250]);
  assert.deepEqual(rows[3],['15/11/2026','Dépense','','Déplacements • Transport','',40]);
  assert.deepEqual(rows[4],['15/11/2026','Encaissement client','Client A','نقداً • Acompte','',100]);
  assert.deepEqual(rows[5],['15/11/2026','Règlement fournisseur','Fournisseur B','تحويل • R-2','',-200]);
  assert.deepEqual(rows[6],['15/11/2026','Avoir fournisseur','Fournisseur B','إشعار دائن • AV-3','',50]);
});

test('keeps empty report sections empty',()=>{
  assert.deepEqual(buildActivityReportRows({sales:[],returns:[],purchases:[],expenses:[],customerPayments:[],supplierPayments:[]}),[]);
});

test('reports include draftless and quote invoices, retain global discounts, and never count a POS invoice twice',()=>{
  const {includeInvoicedSales}=require('../.test-build/domain/activity-report.js');
  const invoices=[{id:1,type:'invoice',number:'FV-00001',customerName:'Client',date:'12/11/2026',total:11.01,lines:[
    {productName:'A',qty:1,unitPrice:15,total:15},{productName:'B',qty:1,unitPrice:15,total:15}
  ]}];
  const existing={id:3,documentId:2,date:'12/11/2026',productName:'POS',customerName:'Client',qty:1,unitPrice:30,total:30,unitCost:10};
  const rows=includeInvoicedSales([existing],[...invoices,{...invoices[0],id:2,type:'invoice'},{...invoices[0],id:4,type:'proforma'}]);
  assert.deepEqual(rows.map(item=>item.total),[30,5.51,5.5]);
  assert.equal(rows[0].unitCost,10);
  assert.equal(rows[1].unitCost,undefined);
  assert.equal(rows[1].reference,'FV-00001');
});

test('invoice returns use stable line keys and exact discounted amounts',()=>{
  const {includeInvoicedSales}=require('../.test-build/domain/activity-report.js');
  const {createSalesReturn,normalizeSalesReturns,quantityAvailableForReturn}=require('../.test-build/domain/sales-returns.js');
  const invoice={id:17,type:'invoice',sourceQuoteId:3,date:'12/11/2026',number:'FV-00017',customerName:'Client',total:10.01,lines:[
    {productId:11,productName:'A',qty:2,unitPrice:5,total:10},
    {productId:11,productName:'A',qty:1,unitPrice:10,total:10},
  ]};
  const move={id:'invoice-17-11',warehouseId:'secondary',productId:'11',kind:'sale',quantity:3,unitCost:1.5};
  const [first,second]=includeInvoicedSales([], [invoice], [move]);
  assert.deepEqual([first.total,second.total],[5.01,5]);
  assert.deepEqual([first.sourceKey,second.sourceKey],['invoice:17:0','invoice:17:1']);
  const make=(sale,quantity,id,existingReturns=[])=>createSalesReturn({sale,quantity,id,existingReturns,date:invoice.date,restock:true,productId:sale.productId});
  const a=make(first,1,1);
  const b=make(second,1,2,[a]);
  const c=make(first,1,3,[a,b]);
  assert.deepEqual([a.total,b.total,c.total],[2.51,5,2.5]);
  assert.equal(a.warehouseId,'secondary');
  assert.equal(a.saleReference,invoice.number);
  assert.equal(a.documentId,invoice.id);
  assert.equal(quantityAvailableForReturn(second,[a]),1);
  assert.equal(quantityAvailableForReturn(first,[a,b,c]),0);
  assert.equal(quantityAvailableForReturn({...first,sourceKey:undefined},[a,b,c]),2);
  assert.throws(()=>make(first,1,4,[a,b,c]));
  assert.deepEqual(normalizeSalesReturns(JSON.parse(JSON.stringify([a,b,c]))),[a,b,c]);
});

test('delivery-first invoices use the original warehouse and reject ambiguous physical returns',()=>{
  const {includeInvoicedSales}=require('../.test-build/domain/activity-report.js');
  const {createSalesReturn,quantityAvailableForReturn}=require('../.test-build/domain/sales-returns.js');
  const invoice={id:17,type:'invoice',sourceQuoteId:3,date:'12/11/2026',number:'FV-00017',customerName:'Client',total:10,lines:[
    {productId:11,productName:'A',qty:2,unitPrice:5,total:10},
  ]};
  const delivery={...invoice,id:20,type:'delivery',number:'BS-00020'};
  const move={id:'delivery-20-0',warehouseId:'north',productId:'11',kind:'sale',quantity:2,unitCost:3};
  const select=moves=>includeInvoicedSales([], [invoice,delivery], moves)[0];
  assert.equal(select([move]).warehouseId,'north');
  assert.equal(select([move]).unitCost,3);
  assert.equal(select([move]).canRestock,true);
  for(const moves of [
    [],
    [{...move,unitCost:undefined}],
    [{...move,quantity:1}],
    [{...move,quantity:1},{...move,id:'delivery-20-1',warehouseId:'south',quantity:1}],
    [move,{...move,id:'invoice-17-11'}],
    [{...move,id:'delivery-201-0'}],
  ]){
    const sale=select(moves);
    const input={sale,quantity:1,id:1,existingReturns:[],date:invoice.date,restock:true,productId:11};
    assert.equal(sale.canRestock,false);
    assert.throws(()=>createSalesReturn(input));
    assert.equal(createSalesReturn({...input,restock:false}).total,5);
  }
  const noLines=includeInvoicedSales([], [{...invoice,lines:[]}])[0];
  assert.equal(quantityAvailableForReturn(noLines,[]),0);
  const dup=includeInvoicedSales([], [invoice,invoice]);
  assert.ok(dup.every(line=>quantityAvailableForReturn(line,[])===0));
});

test('profit calculation attributes an invoice return to one line, even with colliding legacy sale IDs',()=>{
  const {calculateProfitLoss}=require('../.test-build/domain/profit-loss.js');
  const result=calculateProfitLoss([
    {id:17,qty:1,unitCost:10,total:30},
    {id:17,sourceKey:'invoice:17:0',qty:1,unitCost:3,total:7},
    {id:17,sourceKey:'invoice:17:1',qty:1,unitCost:5,total:11},
  ],[{saleId:17,sourceKey:'invoice:17:1',qty:1,total:11,restocked:true}],[]);
  assert.equal(result.revenue,37);
  assert.equal(result.costOfGoodsSold,13);
  assert.equal(result.grossProfitOnCostedSales,24);
});
