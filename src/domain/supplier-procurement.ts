export type SupplierRequestStatus = 'draft'|'sent'|'quoted'|'accepted'|'rejected'|'cancelled';
export type SupplierRequestLine = {
  productId: number;
  variantId?: string;
  productName: string;
  quantity: number;
};
export type SupplierOfferLine = {
  productId: number;
  variantId?: string;
  unitCostCentimes: number;
  leadTimeDays?: number;
};
export type SupplierPriceOffer = {
  id: string;
  receivedAt: string;
  lines: SupplierOfferLine[];
  note?: string;
};
export type SupplierPriceRequest = {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  validUntil?: string;
  status: SupplierRequestStatus;
  lines: SupplierRequestLine[];
  offers: SupplierPriceOffer[];
};
export type SupplierOfferComparison = {
  productId: number;
  variantId?: string;
  productName: string;
  quantity: number;
  supplierId: string;
  supplierName: string;
  requestId: string;
  unitCostCentimes: number;
  lineTotalCentimes: number;
  leadTimeDays?: number;
};
export type SupplierInvoiceLine = {
  productId: number;
  variantId?: string;
  description: string;
  quantity: number;
  unitCostCentimes: number;
};
export type SupplierInvoice = {
  id: string;
  number: string;
  supplierId: string;
  purchaseOrderId: number;
  issuedAt: string;
  dueDate?: string;
  lines: SupplierInvoiceLine[];
  totalCentimes: number;
};
export type ReceivedPurchaseOrder = {
  id: number;
  supplierId: string;
  status: 'ordered'|'partially_received'|'received'|'cancelled';
  lines: Array<{productId:number;variantId?:string;productName:string;quantity:number;receivedQuantity:number}>;
};
const validDate=(value:string)=>!!value.trim()&&Number.isFinite(Date.parse(value));
const key=(productId:number,variantId?:string)=>productId+'::'+(variantId||'');
function validateRequest(request:SupplierPriceRequest):void {
  if(!request.id.trim()||!request.number.trim()||!request.supplierId.trim()||!request.supplierName.trim()||
    !validDate(request.createdAt)||(request.validUntil!==undefined&&!validDate(request.validUntil))||
    !['draft','sent','quoted','accepted','rejected','cancelled'].includes(request.status)||
    !Array.isArray(request.lines)||!request.lines.length||!Array.isArray(request.offers)) throw new Error('طلب عرض الثمن المحفوظ غير صالح');
  const seen=new Set<string>();
  for(const line of request.lines){
    const id=key(line.productId,line.variantId);
    if(!Number.isSafeInteger(line.productId)||line.productId<=0||!line.productName.trim()||
      !Number.isSafeInteger(line.quantity)||line.quantity<=0||
      (line.variantId!==undefined&&!line.variantId.trim())||seen.has(id)) throw new Error('سطر طلب عرض الثمن غير صالح');
    seen.add(id);
  }
  for(const offer of request.offers){
    if(!offer.id.trim()||!validDate(offer.receivedAt)||!Array.isArray(offer.lines)||offer.lines.length!==request.lines.length) throw new Error('عرض المورد المحفوظ غير صالح');
    const offerKeys=new Set<string>();
    for(const line of offer.lines){
      const id=key(line.productId,line.variantId);
      if(!seen.has(id)||offerKeys.has(id)||!Number.isSafeInteger(line.unitCostCentimes)||line.unitCostCentimes<0||
        (line.leadTimeDays!==undefined&&(!Number.isSafeInteger(line.leadTimeDays)||line.leadTimeDays<0))) throw new Error('ثمن أو مدة التسليم في عرض المورد غير صالحة');
      offerKeys.add(id);
    }
  }
}
export function createSupplierPriceRequest(input:{
  id:string;number:string;supplierId:string;supplierName:string;createdAt:string;validUntil?:string;
  lines:SupplierRequestLine[];
}):SupplierPriceRequest {
  const request:SupplierPriceRequest={...input,status:'draft',offers:[]};
  validateRequest(request);
  return request;
}
export function transitionSupplierPriceRequest(request:SupplierPriceRequest,next:SupplierRequestStatus):SupplierPriceRequest {
  validateRequest(request);
  const allowed:Record<SupplierRequestStatus,SupplierRequestStatus[]> = {
    draft:['sent','cancelled'],sent:['quoted','cancelled'],quoted:['accepted','rejected','cancelled'],
    accepted:[],rejected:[],cancelled:[]
  };
  if(!allowed[request.status].includes(next)) throw new Error('المرحلة المطلوبة غير مسموحة لطلب الثمن');
  return {...request,status:next};
}
export function recordSupplierPriceOffer(request:SupplierPriceRequest,offer:SupplierPriceOffer):SupplierPriceRequest {
  validateRequest(request);
  if(request.status!=='sent'&&request.status!=='quoted') throw new Error('خاص إرسال طلب الثمن قبل تسجيل عرض المورد');
  const next={...request,offers:[...request.offers,offer],status:'quoted' as const};
  validateRequest(next);
  if(request.offers.some(item=>item.id===offer.id)) throw new Error('معرف عرض المورد مسجل من قبل');
  return next;
}
export function compareSupplierOffers(requests:SupplierPriceRequest[]):SupplierOfferComparison[] {
  const rows:SupplierOfferComparison[]=[];
  for(const request of requests){
    validateRequest(request);
    if(request.status==='cancelled'||request.status==='rejected'||request.status==='draft') continue;
    const offer=request.offers[request.offers.length-1];
    if(!offer) continue;
    for(const line of offer.lines){
      const requested=request.lines.find(item=>key(item.productId,item.variantId)===key(line.productId,line.variantId));
      if(!requested) continue;
      rows.push({productId:line.productId,variantId:line.variantId,productName:requested.productName,quantity:requested.quantity,
        supplierId:request.supplierId,supplierName:request.supplierName,requestId:request.id,
        unitCostCentimes:line.unitCostCentimes,lineTotalCentimes:line.unitCostCentimes*requested.quantity,leadTimeDays:line.leadTimeDays});
    }
  }
  return rows.sort((a,b)=>a.productId-b.productId||(a.variantId||'').localeCompare(b.variantId||'')||
    a.unitCostCentimes-b.unitCostCentimes||a.supplierName.localeCompare(b.supplierName));
}
export function createSupplierInvoice(input:{
  id:string;number:string;supplierId:string;purchaseOrder:ReceivedPurchaseOrder;issuedAt:string;dueDate?:string;
  lines:SupplierInvoiceLine[];previousInvoices?:SupplierInvoice[];
}):SupplierInvoice {
  const {purchaseOrder}=input;
  if(!input.id.trim()||!input.number.trim()||!input.supplierId.trim()||input.supplierId!==purchaseOrder.supplierId||
    !Number.isSafeInteger(purchaseOrder.id)||purchaseOrder.id<=0||purchaseOrder.status==='cancelled'||
    !validDate(input.issuedAt)||(input.dueDate!==undefined&&!validDate(input.dueDate))||
    !Array.isArray(input.lines)||!input.lines.length) throw new Error('بيانات فاتورة المورد غير صالحة أو لا تطابق أمر الشراء');
  const duplicate=(input.previousInvoices||[]).some(invoice=>invoice.supplierId===input.supplierId&&invoice.number.trim().toLowerCase()===input.number.trim().toLowerCase());
  if(duplicate) throw new Error('رقم فاتورة المورد مسجل من قبل');
  const orderLines=new Map(purchaseOrder.lines.map(line=>[key(line.productId,line.variantId),line]));
  const invoiced=new Map<string,number>();
  for(const invoice of input.previousInvoices||[]){
    if(invoice.purchaseOrderId!==purchaseOrder.id) continue;
    for(const line of invoice.lines) invoiced.set(key(line.productId,line.variantId),(invoiced.get(key(line.productId,line.variantId))||0)+line.quantity);
  }
  const seen=new Set<string>();
  let totalCentimes=0;
  for(const line of input.lines){
    const id=key(line.productId,line.variantId),ordered=orderLines.get(id);
    if(!ordered||seen.has(id)||!line.description.trim()||!Number.isSafeInteger(line.quantity)||line.quantity<=0||
      !Number.isSafeInteger(line.unitCostCentimes)||line.unitCostCentimes<0) throw new Error('سطر فاتورة المورد غير صالح أو غير موجود في أمر الشراء');
    seen.add(id);
    const available=ordered.receivedQuantity-(invoiced.get(id)||0);
    if(line.quantity>available) throw new Error('كمية الفاتورة تتجاوز الكمية المستلمة أو المفوترة من قبل');
    totalCentimes+=line.quantity*line.unitCostCentimes;
    if(!Number.isSafeInteger(totalCentimes)) throw new Error('مجموع فاتورة المورد تجاوز الحد المالي المسموح');
  }
  return {id:input.id,number:input.number.trim(),supplierId:input.supplierId,purchaseOrderId:purchaseOrder.id,
    issuedAt:input.issuedAt,dueDate:input.dueDate,lines:input.lines.map(line=>({...line})),totalCentimes};
}
