const test=require('node:test');
const assert=require('node:assert/strict');
const {orderDatedReport,moneyReportTotal,selectOpenBalances,buildCashDetail,buildStockDetail,buildDetailReportHtml}=require('../.test-build/domain/report-details.js');
const {filterByDateRange}=require('../.test-build/report-filters.js');

test('detail output orders mixed saved date formats, leaving unknown legacy dates last',()=>{
  const records=[{date:'legacy',ref:'old'},{date:'29/10/2026',ref:'oct'},{date:'2026-11-02',ref:'nov'}];
  assert.deepEqual(orderDatedReport(records).map(row=>row.ref),['nov','oct','old']);
  assert.deepEqual(orderDatedReport(filterByDateRange(records,'2026-11-02','')).map(row=>row.ref),['nov']);
  assert.equal(moneyReportTotal([0.17,0.11,-0.25]),0.03);
});

test('cash direction uses ledger sign without changing source entries',()=>{
  const rows=[
    {id:'opening',date:'2026-01-01',direction:'in',source:'opening',amountCentimes:1000},
    {id:'manual-1',date:'2026-01-02',direction:'out',source:'manual',amountCentimes:333},
  ];
  assert.deepEqual(buildCashDetail(rows,'all').map(row=>[row.id,row.signedCentimes]),[['manual-1',-333],['opening',1000]]);
  assert.deepEqual(buildCashDetail(rows,'out').map(row=>row.id),['manual-1']);
  assert.equal(rows[1].amountCentimes,333);
});

test('inventory detail respects warehouse, negative adjustment and transfer legs',()=>{
  const make=(kind,warehouseId,quantity)=>({date:'2026-01-02',kind,warehouseId,productId:'p',quantity});
  const rows=[make('transfer_out','A',4),make('adjustment','A',-2),make('transfer_in','B',4)];
  assert.deepEqual(buildStockDetail(rows,'A').map(row=>row.signedQuantity),[-4,-2]);
  assert.deepEqual(buildStockDetail(rows,'').map(row=>row.signedQuantity),[-4,-2,4]);
  assert.equal(rows[0].quantity,4);
});

test('current balances search matches accents and separates open debts from settled contacts',()=>{
  const list=[{name:'Électricité Atlas',due:901},{name:'Électricité Atlas Sud',due:0},{name:'Électricité Nord',due:400}];
  const selected=selectOpenBalances(list,'atlas electricite',row=>row.name,row=>row.due);
  assert.deepEqual(selected,[list[0]]);
});

test('printable report uses table, direction and escapes names, query and cells',()=>{
  const report={title:'<Stock>',context:'Recherche : <input>',headers:['Produit','DH'],rows:[['<svg onload="x">',-2.06]],summary:[['Marge',-2.06]]};
  const html=buildDetailReportHtml('AR','<company>',report,'Pas de données');
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/<thead>/);
  assert.match(html,/&lt;company&gt;/);
  assert.match(html,/Recherche : &lt;input&gt;/);
  assert.match(html,/&lt;svg onload=&quot;x&quot;&gt;/);
  assert.match(html,/<td dir="ltr">-2.06<\/td>/);
  const empty=buildDetailReportHtml('FR','HamZa',{...report,rows:[]},'<Vide>');
  assert.match(empty,/<html lang="fr" dir="ltr">/);
  assert.match(empty,/&lt;Vide&gt;/);
});
