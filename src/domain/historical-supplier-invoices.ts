import type {StockMovement} from '../inventory';
type Row=Record<string,unknown>;
type ArchivedPayment={id:string;method:string;amountCentimes:number;date:string;reference?:string};
export type ArchivedSupplierInvoice={id:string;number:string;supplierId:string;purchaseOrderId:number;issuedAt:string;dueDate?:string;totalCentimes:number;paidCentimes:number;payments:ArchivedPayment[]};
const bad=():never=>{throw new Error('فواتير الموردين القديمة ما تطابقوش مع سجلات الشراء. البيانات الأصلية ما تبدلاتش.');};
const text=(v:unknown):v is string=>typeof v==='string'&&!!v.trim();
const int=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const pos=(v:unknown):v is number=>int(v)&&v>0;
const date=(v:unknown):v is string=>text(v)&&Number.isFinite(Date.parse(v));
const object=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
function lines(v:unknown):Row[]{if(!Array.isArray(v)||v.length===0||!v.every(object))return bad();return v;}

export function migrateHistoricalSupplierInvoices(input:{
  invoices:Row[]; payments:Row[]; orders:Row[]; suppliers:Row[]; purchases:Row[]; cash:Row[]; bank:Row[]; stock:StockMovement[];
  warehouse:(value:unknown)=>string;
}){
  const {invoices,payments,orders,suppliers,purchases,cash,bank,stock,warehouse}=input;
  const supplierNames=new Map(suppliers.map(row=>[String(row.id),row.name]));
  const ordersById=new Map<unknown,{supplierId:string;lines:Map<unknown,{received:number;used:number;unit:number;receipts:Row[]}>}>();
  const stockById=new Map(stock.map(row=>[row.id,row]));
  const purchasesByOrder=new Map<unknown,Row[]>();
  for(const purchase of purchases){
    if(purchase.purchaseOrderId===undefined)continue;
    const list=purchasesByOrder.get(purchase.purchaseOrderId)??[];
    list.push(purchase);purchasesByOrder.set(purchase.purchaseOrderId,list);
  }
  for(const order of orders){
    if(!pos(order.id)||ordersById.has(order.id)||!['received','cancelled'].includes(String(order.status)))return bad();
    const candidates=suppliers.filter(item=>item.name===order.supplierName);
    const supplierId=order.supplierId??(candidates.length===1?String(candidates[0].id):undefined);
    if(!text(supplierId)||supplierNames.get(supplierId)!==order.supplierName)return bad();
    const group={supplierId,lines:new Map<unknown,{received:number;used:number;unit:number;receipts:Row[]}>()};
    for(const line of lines(order.lines)){
      if(!pos(line.productId)||line.variantId!==undefined||group.lines.has(line.productId)||
         !pos(line.quantity)||!int(line.receivedQuantity)||line.receivedQuantity>line.quantity||
         (order.status==='received'&&line.receivedQuantity!==line.quantity)||
         typeof line.unitCost!=='number'||line.unitCost<0||!Number.isSafeInteger(Math.round(line.unitCost*100)))return bad();
      group.lines.set(line.productId,{received:line.receivedQuantity,used:0,unit:Math.round(line.unitCost*100),receipts:[]});
    }
    for(const purchase of purchasesByOrder.get(order.id)??[]){
      const line=group.lines.get(purchase.productId),movement=stockById.get('legacy-po-receipt-'+purchase.id);
      if(!line||!pos(purchase.id)||!pos(purchase.qty)||typeof purchase.total!=='number'||!text(purchase.supplierName)||purchase.supplierName!==order.supplierName||
         purchase.variantId!==undefined||!movement||movement.kind!=='purchase'||movement.reference!==String(order.id)||
         movement.productId!==String(purchase.productId)||movement.quantity!==purchase.qty||movement.warehouseId!==warehouse(purchase.warehouseId))return bad();
      line.receipts.push(purchase);
    }
    for(const line of group.lines.values()){
      if(line.receipts.reduce((sum,row)=>sum+Number(row.qty),0)!==line.received)return bad();
      line.receipts.sort((a,b)=>Number(a.id)-Number(b.id));
    }
    ordersById.set(order.id,group);
  }
  if([...purchasesByOrder.keys()].some(key=>!ordersById.has(key)))return bad();
  const bankById=new Map(bank.map(row=>[row.id,row])),cashById=new Map(cash.map(row=>[row.id,row]));
  const bankPostings=new Set<unknown>(),cashPostings=new Set<unknown>(),seenPayments=new Set<string>();
  const byInvoice=new Map<string,ArchivedPayment[]>();
  for(const payment of payments){
    const {id,invoiceId,supplierId,amountCentimes}=payment;
    if(!text(id)||!text(invoiceId)||!text(supplierId)||!pos(amountCentimes)||!date(payment.date)||!text(payment.method)||
      seenPayments.has(id)||!supplierNames.has(supplierId)||!['cash','bank','cheque'].includes(payment.method)||
      (payment.reference!==undefined&&typeof payment.reference!=='string')||(payment.method==='cheque'&&!text(payment.reference)))return bad();
    seenPayments.add(id);
    if(payment.method==='bank'){
      const key='supplier-invoice-payment-bank-'+id,movement=bankById.get(key);
      if(!movement||bankById.has('supplier-invoice-payment-bank-reversal-'+id)||!text(payment.bankAccountId)||movement.kind!=='supplier_payment'||
        movement.accountId!==payment.bankAccountId||movement.amountCentimes!==amountCentimes||movement.date!==payment.date)return bad();
      bankPostings.add(key);
    }else if(payment.method==='cash'){
      const key='supplier-invoice-payment-cash-'+id,movement=cashById.get(key);
      if(!movement||cashById.has('supplier-invoice-payment-cash-reversal-'+id)||movement.kind!=='cash_out'||
        movement.amountCentimes!==amountCentimes||movement.date!==payment.date)return bad();
      cashPostings.add(key);
    }
    const list=byInvoice.get(invoiceId)??[];
    list.push({id,method:payment.method,amountCentimes,date:payment.date,reference:payment.reference as string|undefined});
    byInvoice.set(invoiceId,list);
  }
  // Reversed settlements disappeared from the old invoice list but kept both journal entries.
  for(const [journal,postings,mode,inKind,outKind] of [[cashById,cashPostings,'cash','cash_in','cash_out'],[bankById,bankPostings,'bank','deposit','supplier_payment']] as const){
    const prefix='supplier-invoice-payment-'+mode+'-';
    for(const [key,movement] of journal){
      if(typeof key!=='string'||!key.startsWith(prefix)||postings.has(key))continue;
      if(key.startsWith(prefix+'reversal-')){
        const original=journal.get(prefix+key.slice((prefix+'reversal-').length));
        if(!original||original.kind!==outKind||movement.kind!==inKind||original.amountCentimes!==movement.amountCentimes||original.accountId!==movement.accountId)return bad();
      }else{
        const reversal=journal.get(prefix+'reversal-'+key.slice(prefix.length));
        if(!reversal||movement.kind!==outKind||reversal.kind!==inKind||movement.amountCentimes!==reversal.amountCentimes||movement.accountId!==reversal.accountId)return bad();
        postings.add(key);
      }
    }
  }
  const archive:ArchivedSupplierInvoice[]=[],seenInvoices=new Set<string>(),invoiceNumbers=new Set<string>();
  const paidByPurchase=new Map<number,number>();
  const sorted=[...invoices].sort((a,b)=>String(a.issuedAt).localeCompare(String(b.issuedAt))||String(a.id).localeCompare(String(b.id)));
  for(const invoice of sorted){
    const {id,number,supplierId,purchaseOrderId,totalCentimes}=invoice;
    if(!text(id)||seenInvoices.has(id)||!text(number)||!text(supplierId)||!pos(purchaseOrderId)||!int(totalCentimes)||
      !date(invoice.issuedAt)||(invoice.dueDate!==undefined&&!date(invoice.dueDate)))return bad();
    const key=JSON.stringify([supplierId,number.trim().toLowerCase()]);
    const order=ordersById.get(purchaseOrderId);
    if(!order||order.supplierId!==supplierId||invoiceNumbers.has(key))return bad();
    const linked=byInvoice.get(id)??[],paidCentimes=linked.reduce((sum,payment)=>sum+payment.amountCentimes,0);
    if(!int(paidCentimes)||paidCentimes>totalCentimes||payments.some(payment=>payment.invoiceId===id&&payment.supplierId!==supplierId))return bad();
    byInvoice.delete(id);seenInvoices.add(id);invoiceNumbers.add(key);
    let total=0,remainingPaid=paidCentimes;
    const products=new Set<unknown>();
    for(const item of lines(invoice.lines)){
      const line=order.lines.get(item.productId);
      if(!line||products.has(item.productId)||item.variantId!==undefined||!text(item.description)||
        !pos(item.quantity)||item.unitCostCentimes!==line.unit||line.used+item.quantity>line.received)return bad();
      products.add(item.productId);
      total+=item.quantity*line.unit;
      if(!int(total))return bad();
      const start=line.used,end=start+item.quantity;
      let cursor=0;
      for(const receipt of line.receipts){
        const next=cursor+Number(receipt.qty),overlap=Math.max(0,Math.min(end,next)-Math.max(start,cursor));
        if(overlap){
          if(!pos(receipt.id)||receipt.unitCost!==line.unit/100||Math.round(Number(receipt.total)*100)!==Number(receipt.qty)*line.unit)return bad();
          const applied=Math.min(remainingPaid,overlap*line.unit);
          if(applied>0)paidByPurchase.set(receipt.id,(paidByPurchase.get(receipt.id)??0)+applied);
          remainingPaid-=applied;
        }
        cursor=next;
      }
      line.used=end;
    }
    if(total!==totalCentimes||remainingPaid!==0)return bad();
    archive.push({id,number,supplierId,purchaseOrderId,issuedAt:invoice.issuedAt,dueDate:invoice.dueDate as string|undefined,totalCentimes,paidCentimes,payments:linked});
  }
  if(byInvoice.size)return bad();
  for(const purchase of purchases){
    const paid=paidByPurchase.get(Number(purchase.id))??0;
    // Existing settlement of the same receipt could be the same real payment; do not infer.
    if(paid>0&&((purchase.paidCentimes??0)!==0||(purchase.returnedCentimes??0)!==0))return bad();
  }
  return {archive,paidByPurchase,bankPostings};
}

/** Verify the persisted display projection and its exact link to the archived payments. */
export function verifyHistoricalSupplierInvoiceArchive(invoices:Row[],payments:Row[],archive:Row[],purchases:Row[]){
  const invoiceById=new Map(invoices.map(row=>[row.id,row]));
  const paymentById=new Map(payments.map(row=>[row.id,row]));
  if(archive.length!==invoices.length||invoiceById.size!==invoices.length||paymentById.size!==payments.length)return bad();
  let paid=0,applied=0;
  for(const row of archive){
    const original=invoiceById.get(row.id);
    if(!original||!Array.isArray(row.payments)||!int(row.paidCentimes)||
      ['number','supplierId','purchaseOrderId','issuedAt','dueDate','totalCentimes'].some(key=>row[key]!==original[key]))return bad();
    invoiceById.delete(row.id);
    let total=0;
    for(const entry of row.payments){
      if(!object(entry))return bad();
      const payment=paymentById.get(entry.id);
      if(!payment||payment.invoiceId!==row.id||!pos(entry.amountCentimes)||
        ['amountCentimes','date','method','reference'].some(key=>entry[key]!==payment[key]))return bad();
      paymentById.delete(entry.id);total+=entry.amountCentimes;
    }
    if(!int(total)||total!==row.paidCentimes||total>Number(row.totalCentimes))return bad();
    paid+=total;
  }
  if(invoiceById.size||paymentById.size)return bad();
  for(const receipt of purchases)if(receipt.historicalInvoicePaidCentimes!==undefined){
    const amount=receipt.historicalInvoicePaidCentimes;
    if(!pos(amount)||Math.round(Number(receipt.paidAmount)*100)!==amount||
       receipt.paymentMethod!==undefined||receipt.bankAccountId!==undefined)return bad();
    applied+=amount;
  }
  if(!int(paid)||!int(applied)||paid!==applied)return bad();
}
