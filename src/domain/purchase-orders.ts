export type PurchaseOrderLine = {
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
};
export type PurchaseOrderStatus = 'draft'|'ordered'|'partially_received'|'received'|'cancelled';
export type PurchaseOrder = {
  id: number;
  supplierName: string;
  createdAt: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
};
export type PurchaseReceiptLine = {productId:number; quantity:number};
export type PurchaseReceipt = {
  order: PurchaseOrder;
  received: PurchaseReceiptLine[];
  remaining: number;
};
function validDate(value: string): boolean {
  return !!value.trim() && Number.isFinite(Date.parse(value));
}
function validateOrder(order: PurchaseOrder): void {
  if (!Number.isSafeInteger(order.id) || order.id <= 0 || !order.supplierName.trim() ||
      !validDate(order.createdAt) || (order.expectedDate!==undefined && !validDate(order.expectedDate)) || !Array.isArray(order.lines) || order.lines.length === 0 ||
      !['draft','ordered','partially_received','received','cancelled'].includes(order.status)) {
    throw new Error('أمر الشراء المحفوظ غير صالح');
  }
  const ids = new Set<number>();
  for (const line of order.lines) {
    if (!Number.isSafeInteger(line.productId) || line.productId <= 0 || !line.productName.trim() ||
        !Number.isSafeInteger(line.quantity) || line.quantity <= 0 ||
        !Number.isSafeInteger(line.receivedQuantity) || line.receivedQuantity < 0 ||
        line.receivedQuantity > line.quantity || !Number.isFinite(line.unitCost) || line.unitCost < 0 ||
        ids.has(line.productId)) {
      throw new Error('سطر أمر الشراء المحفوظ غير صالح');
    }
    ids.add(line.productId);
  }
  const allReceived = order.lines.every(line => line.receivedQuantity === line.quantity);
  const anyReceived = order.lines.some(line => line.receivedQuantity > 0);
  if ((order.status === 'received' && !allReceived) ||
      (order.status === 'ordered' && anyReceived) ||
      (order.status === 'partially_received' && (!anyReceived || allReceived))) {
    throw new Error('حالة استلام أمر الشراء غير متطابقة مع الكميات');
  }
}
export function createPurchaseOrder(input: {
  id:number; supplierName:string; createdAt:string; expectedDate?:string;
  lines:Array<{productId:number;productName:string;quantity:number;unitCost:number}>;
}): PurchaseOrder {
  if (!Number.isSafeInteger(input.id) || input.id<=0 || !input.supplierName.trim() ||
      !validDate(input.createdAt) || (input.expectedDate!==undefined && !validDate(input.expectedDate)) ||
      !Array.isArray(input.lines) || input.lines.length===0) {
    throw new Error('بيانات أمر الشراء غير صالحة');
  }
  const seen=new Set<number>();
  const lines=input.lines.map(line=>{
    if(!Number.isSafeInteger(line.productId)||line.productId<=0||!line.productName.trim()||
       !Number.isSafeInteger(line.quantity)||line.quantity<=0||
       !Number.isFinite(line.unitCost)||line.unitCost<0||seen.has(line.productId)) {
      throw new Error('راجع المنتجات والكميات وأثمان الشراء في أمر الشراء');
    }
    seen.add(line.productId);
    return {...line,receivedQuantity:0};
  });
  return {id:input.id,supplierName:input.supplierName.trim(),createdAt:input.createdAt,
    expectedDate:input.expectedDate,status:'ordered',lines};
}
export function receivePurchaseOrder(
  order: PurchaseOrder,
  receipt: {lines:PurchaseReceiptLine[]; date:string},
): PurchaseReceipt {
  validateOrder(order);
  if(order.status==='cancelled'||order.status==='received') throw new Error('أمر الشراء ملغى أو مستلم بالكامل');
  if(!validDate(receipt.date)||!Array.isArray(receipt.lines)||receipt.lines.length===0)
    throw new Error('بيانات استلام البضاعة غير صالحة');
  const requested=new Map<number,number>();
  for(const line of receipt.lines){
    if(!Number.isSafeInteger(line.productId)||!Number.isSafeInteger(line.quantity)||line.quantity<=0||
       requested.has(line.productId)) throw new Error('كميات الاستلام غير صالحة أو مكررة');
    requested.set(line.productId,line.quantity);
  }
  let remaining=0;
  const lines=order.lines.map(line=>{
    const quantity=requested.get(line.productId)||0;
    if(quantity>line.quantity-line.receivedQuantity) throw new Error('كمية الاستلام تتجاوز الكمية المتبقية في الأمر');
    remaining+=line.quantity-line.receivedQuantity-quantity;
    return {...line,receivedQuantity:line.receivedQuantity+quantity};
  });
  for(const id of requested.keys()) if(!order.lines.some(line=>line.productId===id))
    throw new Error('المنتج المستلم غير موجود في أمر الشراء');
  const allReceived=lines.every(line=>line.receivedQuantity===line.quantity);
  return {order:{...order,lines,status:allReceived?'received':'partially_received'},received:receipt.lines,remaining};
}
export function cancelPurchaseOrder(order:PurchaseOrder):PurchaseOrder {
  validateOrder(order);
  if(order.status==='received'||order.status==='cancelled') throw new Error('لا يمكن إلغاء هذا الأمر');
  return {...order,status:'cancelled'};
}
