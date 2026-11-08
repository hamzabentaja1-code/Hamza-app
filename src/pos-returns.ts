export type PosSaleLine={id:number;productId?:number;warehouseId?:string;productName:string;customerName:string;qty:number;unitPrice:number;total:number;date:string;paymentMethod?:string};
export type PosReturn={id:string;saleId:number;productId:number;warehouseId:string;productName:string;customerName:string;quantity:number;totalCentimes:number;date:string;method:'cash'|'bank'|'cheque';reference?:string};

export function returnedQuantity(sale:PosSaleLine,returns:PosReturn[]):number{return returns.filter(item=>item.saleId===sale.id).reduce((sum,item)=>sum+item.quantity,0);}
export function remainingReturnCentimes(sale:PosSaleLine,returns:PosReturn[]):number{return Math.max(0,Math.round(sale.total*100)-returns.filter(item=>item.saleId===sale.id).reduce((sum,item)=>sum+item.totalCentimes,0));}
export function returnAmountCentimes(sale:PosSaleLine,returns:PosReturn[],quantity:number):number{
 const remainingQty=sale.qty-returnedQuantity(sale,returns);const remainingAmount=remainingReturnCentimes(sale,returns);
 if(!Number.isSafeInteger(quantity)||quantity<=0||quantity>remainingQty)throw new Error('كمية الإرجاع أكبر من الكمية المتبقية');
 return quantity===remainingQty?remainingAmount:Math.min(remainingAmount,Math.round(Math.round(sale.total*100)*quantity/sale.qty));
}
export function validatePosReturn(item:PosReturn,sales:PosSaleLine[],existing:PosReturn[]):string[]{
 const errors:string[]=[];const sale=sales.find(record=>record.id===item.saleId);
 if(!item.id.trim()||existing.some(record=>record.id===item.id))errors.push('معرف الإرجاع ناقص أو مستعمل');
 if(!sale)errors.push('عملية البيع الأصلية غير موجودة');
 if(sale&&(!sale.productId||!item.productId||sale.productId!==item.productId))errors.push('المنتج المرتجع غير مربوط بعملية البيع');
 if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)errors.push('كمية الإرجاع خاصها تكون أكبر من صفر');
 if(sale&&Number.isSafeInteger(item.quantity)&&item.quantity>0&&item.quantity>sale.qty-returnedQuantity(sale,existing))errors.push('كمية الإرجاع أكبر من الكمية المتبقية');
 if(sale&&Number.isSafeInteger(item.quantity)&&item.quantity>0&&item.quantity<=sale.qty-returnedQuantity(sale,existing)&&item.totalCentimes!==returnAmountCentimes(sale,existing,item.quantity))errors.push('مبلغ الإرجاع غير مطابق للمبلغ الأصلي');
 if(!Number.isSafeInteger(item.totalCentimes)||item.totalCentimes<0)errors.push('مبلغ الإرجاع غير صالح');
 if(!item.warehouseId.trim())errors.push('المخزن المرتبط بالبيع غير موجود');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||Number.isNaN(new Date(item.date+'T00:00:00Z').getTime())||new Date(item.date+'T00:00:00Z').toISOString().slice(0,10)!==item.date)errors.push('تاريخ الإرجاع غير صالح');
 if(!['cash','bank','cheque'].includes(item.method))errors.push('طريقة الإرجاع غير صالحة');
 if(item.method==='cheque'&&!item.reference?.trim())errors.push('مرجع الشيك إجباري');
 return errors;
}
export function createPosReturn(sale:PosSaleLine,existing:PosReturn[],input:{id:string;quantity:number;date:string;method:PosReturn['method'];reference?:string}):PosReturn{
 const item:PosReturn={id:input.id,saleId:sale.id,productId:sale.productId||0,warehouseId:sale.warehouseId||'',productName:sale.productName,customerName:sale.customerName,quantity:input.quantity,totalCentimes:returnAmountCentimes(sale,existing,input.quantity),date:input.date,method:input.method,reference:input.reference};
 const errors=validatePosReturn(item,[sale],existing);if(errors.length)throw new Error(errors[0]);return item;
}
