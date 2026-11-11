export type SaleForReturn={
  id:number;productId?:number;warehouseId?:string;documentId?:number;productName:string;customerName:string;
  qty:number;total:number;
};
export type SalesReturnRecord={
  id:number;number:string;saleId:number;productId?:number;warehouseId:string;
  documentId?:number;invoiceAllocations?:{documentId:number;creditedCentimes:number;allocatedCentimes:number;status:'partially_paid'|'paid'}[];
  unappliedCentimes?:number;productName:string;customerName:string;qty:number;total:number;reason:string;restocked:boolean;date:string;
};

export function createSalesReturn(input:{
  sale:SaleForReturn;quantity:number;existingReturns:SalesReturnRecord[];id:number;date:string;
  reason?:string;restock:boolean;productId?:number;
}):SalesReturnRecord {
  const {sale}=input;
  if(!Number.isSafeInteger(sale.id)||!Number.isFinite(sale.qty)||sale.qty<=0||
      !Number.isFinite(sale.total)||sale.total<0||!sale.productName.trim()||!sale.customerName.trim())
    throw new Error('مرجع البيع غير صالح للمرتجع.');
  if(!Number.isFinite(input.quantity)||input.quantity<=0||Math.abs(Math.round(input.quantity*1000)-input.quantity*1000)>1e-8)
    throw new Error('كمية المرتجع خاصها تكون أكبر من صفر وبحد أقصى 3 أرقام عشرية.');
  const returned=input.existingReturns.filter(item=>item.saleId===sale.id)
    .reduce((sum,item)=>sum+item.qty,0);
  const remaining=Math.round((sale.qty-returned)*1000)/1000;
  if(input.quantity>remaining+1e-9) throw new Error('كمية المرتجع أكبر من الكمية المتبقية من البيع.');
  if(input.restock&&!Number.isSafeInteger(input.productId)) throw new Error('المنتج غير مرتبط بهذا البيع ولا يمكن إرجاعه للمخزون.');
  if(!Number.isSafeInteger(input.id)||input.id<=0) throw new Error('معرف المرتجع غير صالح.');
  if(input.existingReturns.some(item=>item.id===input.id)) throw new Error('معرف المرتجع مستعمل من قبل.');
  if(!input.date.trim()) throw new Error('تاريخ المرتجع مطلوب.');
  const total=Math.round((sale.total*input.quantity/sale.qty)*100)/100;
  return {
    id:input.id,number:'AV-'+input.id,saleId:sale.id,
    ...(sale.documentId?{documentId:sale.documentId}:{}),
    productId:input.productId,warehouseId:sale.warehouseId||'main',
    productName:sale.productName,customerName:sale.customerName,
    qty:input.quantity,total,reason:input.reason?.trim()||'',restocked:input.restock,date:input.date,
  };
}

export function normalizeSalesReturns(value:unknown):SalesReturnRecord[] {
  if(!Array.isArray(value)) return [];
  return value.filter((item):item is SalesReturnRecord=>{
    if(typeof item!=='object'||item===null)return false;
    const r=item as Partial<SalesReturnRecord>;
    return Number.isSafeInteger(r.id)&&typeof r.number==='string'&&Number.isSafeInteger(r.saleId)&&
      typeof r.warehouseId==='string'&&(r.documentId===undefined||Number.isSafeInteger(r.documentId))&&
      (r.unappliedCentimes===undefined||Number.isSafeInteger(r.unappliedCentimes)&&r.unappliedCentimes>=0)&&
      (r.invoiceAllocations===undefined||Array.isArray(r.invoiceAllocations)&&r.invoiceAllocations.every(allocation=>typeof allocation==='object'&&allocation!==null&&Number.isSafeInteger(allocation.documentId)&&Number.isSafeInteger(allocation.creditedCentimes)&&Number.isSafeInteger(allocation.allocatedCentimes)&&['partially_paid','paid'].includes(allocation.status)))&&
      typeof r.productName==='string'&&typeof r.customerName==='string'&&
      Number.isFinite(r.qty)&&Number(r.qty)>0&&Number.isFinite(r.total)&&Number(r.total)>=0&&
      typeof r.reason==='string'&&typeof r.restocked==='boolean'&&typeof r.date==='string';
  });
}
