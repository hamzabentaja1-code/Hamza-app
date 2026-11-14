export type PurchaseEntryProduct = {id:number;name:string;qty:number};
export type PurchaseEntrySupplier = {name:string;creditLimitCentimes?:number;paymentDelayDays?:number};
export type PurchaseEntryMethod = 'نقداً'|'بطاقة'|'تحويل';
export type PurchaseEntryInput = {
  id:number;
  product:PurchaseEntryProduct;
  supplier:PurchaseEntrySupplier;
  quantity:number;
  unitCost:number;
  paidAmount:number;
  method:PurchaseEntryMethod;
  warehouseId:string;
  date:string;
  createdAt:string;
  currentSupplierDebtCentimes:number;
  bankAccountId?:string;
  bankBalanceCentimes?:number;
};
export type PurchaseEntryResult = {
  purchase:{id:number;productName:string;supplierName:string;qty:number;unitCost:number;total:number;paidAmount:number;paymentMethod:PurchaseEntryMethod;bankAccountId?:string;date:string;paymentDelayDays?:number};
  movement:{id:string;productId:string;warehouseId:string;kind:'purchase';quantity:number;unitCost:number;createdAt:string;reference:string;note:string};
  newProductQuantity:number;
  totalCentimes:number;
  paidCentimes:number;
};

/** Validate and prepare the linked purchase, stock receipt, and initial settlement as one transaction. */
export function preparePurchaseEntry(input:PurchaseEntryInput):PurchaseEntryResult {
  const quantity=input.quantity;
  const unitCostCentimes=Math.round(input.unitCost*100);
  const paidCentimes=Math.round(input.paidAmount*100);
  const totalCentimes=quantity*unitCostCentimes;
  if(!Number.isSafeInteger(input.id)||input.id<=0||!input.product||!Number.isSafeInteger(input.product.id)||input.product.id<=0||!input.product.name.trim()||!input.supplier?.name.trim()||!input.warehouseId.trim()||!input.date.trim()||!input.createdAt.trim()||!Number.isInteger(quantity)||quantity<1||!Number.isFinite(input.unitCost)||input.unitCost<0||!Number.isSafeInteger(unitCostCentimes)||!Number.isSafeInteger(totalCentimes)||!Number.isFinite(input.paidAmount)||input.paidAmount<0||!Number.isSafeInteger(paidCentimes)||paidCentimes>totalCentimes||!Number.isSafeInteger(input.currentSupplierDebtCentimes)||input.currentSupplierDebtCentimes<0){
    throw new Error('راجع كمية الشراء والثمن والمبلغ المؤدى.');
  }
  const debtAfterPurchase=totalCentimes-paidCentimes;
  if(input.supplier.creditLimitCentimes!==undefined&&input.currentSupplierDebtCentimes+debtAfterPurchase>input.supplier.creditLimitCentimes){
    throw new Error('تجاوز سقف الدين');
  }
  const usesBank=paidCentimes>0&&(input.method==='بطاقة'||input.method==='تحويل');
  if(usesBank&&(!input.bankAccountId?.trim()||!Number.isSafeInteger(input.bankBalanceCentimes)||input.bankBalanceCentimes!<0)){
    throw new Error('اختار الحساب البنكي للتحويل.');
  }
  if(usesBank&&paidCentimes>input.bankBalanceCentimes!){
    throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');
  }
  const unitCost=unitCostCentimes/100;
  const purchase={id:input.id,productName:input.product.name,supplierName:input.supplier.name,qty:quantity,unitCost,total:totalCentimes/100,paidAmount:paidCentimes/100,paymentMethod:input.method,...(input.supplier.paymentDelayDays!==undefined?{paymentDelayDays:input.supplier.paymentDelayDays}:{}),...(usesBank?{bankAccountId:input.bankAccountId!.trim()}:{ }),date:input.date};
  const movement={id:`purchase-${input.id}`,productId:String(input.product.id),warehouseId:input.warehouseId,kind:'purchase' as const,quantity,unitCost,createdAt:input.createdAt,reference:String(input.id),note:'شراء من المورد '+input.supplier.name};
  const newProductQuantity=input.product.qty+quantity;
  if(!Number.isFinite(newProductQuantity))throw new Error('راجع كمية الشراء والثمن والمبلغ المؤدى.');
  return {purchase,movement,newProductQuantity,totalCentimes,paidCentimes};
}
