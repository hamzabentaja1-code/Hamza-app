export type CustomerOrderStatus='draft'|'confirmed'|'partially_fulfilled'|'fulfilled'|'cancelled';
export type CustomerOrderLine={productId:number;productName:string;qty:number;unitPrice:number;variantId?:string;variantLabel?:string;fulfilledQty:number;trackStock?:boolean};
export type CustomerOrder={id:number;number:string;customerName:string;date:string;status:CustomerOrderStatus;lines:CustomerOrderLine[];total:number;sourceQuoteId?:number;deliveryDocumentIds:number[];invoiceDocumentIds:number[];notes?:string};
export type OrderDocumentLink={id:number;type:'delivery'|'invoice';sourceOrderId:number};
const validQty=(n:number)=>Number.isFinite(n)&&n>0&&Math.round(n*1000)===n*1000;
export function createCustomerOrder(input:Omit<CustomerOrder,'status'|'deliveryDocumentIds'|'invoiceDocumentIds'>):CustomerOrder{
 if(!Number.isSafeInteger(input.id)||input.id<=0||!input.number.trim()||!input.customerName.trim()||!input.date)throw new Error('معلومات الطلب الأساسية غير صالحة');
 if(!Array.isArray(input.lines)||input.lines.length===0)throw new Error('الطلب خاصو يحتوي على سطر واحد على الأقل');
 const lines=input.lines.map(line=>{
  if(!line.productName.trim()||!validQty(line.qty)||!Number.isFinite(line.unitPrice)||line.unitPrice<0)throw new Error('بيانات سطر الطلب غير صالحة');
  if(!Number.isFinite(line.fulfilledQty)||line.fulfilledQty<0||line.fulfilledQty>line.qty)throw new Error('الكمية المسلمة غير صالحة');
  return {...line};
 });
 const total=lines.reduce((sum,line)=>sum+line.qty*line.unitPrice,0);
 if(!Number.isFinite(total)||Math.abs(total-input.total)>0.011)throw new Error('مجموع الطلب لا يطابق مجموع السطور');
 return {...input,lines,status:'draft',deliveryDocumentIds:[],invoiceDocumentIds:[]};
}
export function changeCustomerOrderStatus(order:CustomerOrder,status:CustomerOrderStatus):CustomerOrder{
 if(order.status==='cancelled'||order.status==='fulfilled')throw new Error('لا يمكن تغيير حالة طلب مغلق');
 if(status==='confirmed'&&order.status!=='draft')throw new Error('لا يمكن تأكيد الطلب مرة أخرى');
 if(status==='cancelled'&&order.lines.some(line=>line.fulfilledQty>0))throw new Error('لا يمكن إلغاء طلب تسلمت منه كمية');
 if(status==='fulfilled'&&order.lines.some(line=>line.trackStock!==false&&line.fulfilledQty<line.qty))throw new Error('باقي كميات ما تسلماتش');
 if(status==='partially_fulfilled'||status==='fulfilled')throw new Error('حالة التسليم كتتحدد من عملية التسليم');
 return {...order,status};
}
export function fulfillCustomerOrder(order:CustomerOrder,quantities:Record<string,number>,deliveryDocumentId:number):CustomerOrder{
 if(order.status!=='confirmed'&&order.status!=='partially_fulfilled')throw new Error('أكد الطلب قبل تسجيل التسليم');
 if(!Number.isSafeInteger(deliveryDocumentId)||deliveryDocumentId<=0||order.deliveryDocumentIds.includes(deliveryDocumentId))throw new Error('رقم سند التسليم غير صالح أو مكرر');
 const lines=order.lines.map((line,index)=>{
  const key=String(index),qty=quantities[key]??0;
  if(!validQty(qty)&&qty!==0)throw new Error('كمية التسليم غير صالحة');
  if(qty>line.qty-line.fulfilledQty)throw new Error('كمية التسليم كتفوت الكمية المتبقية');
  if(line.trackStock===false&&qty>line.qty-line.fulfilledQty)throw new Error('كمية الخدمة غير صالحة');
  return {...line,fulfilledQty:line.fulfilledQty+qty};
 });
 if(!lines.some((line,index)=>(quantities[String(index)]??0)>0))throw new Error('دخل كمية واحدة على الأقل للتسليم');
 const complete=lines.every(line=>line.fulfilledQty===line.qty);
 return {...order,lines,status:complete?'fulfilled':'partially_fulfilled',deliveryDocumentIds:[...order.deliveryDocumentIds,deliveryDocumentId]};
}
export function linkCustomerOrderDocument(order:CustomerOrder,document:OrderDocumentLink):CustomerOrder{
 if(!Number.isSafeInteger(document.id)||document.id<=0)throw new Error('رقم الوثيقة غير صالح');
 if(document.sourceOrderId!==order.id)throw new Error('الوثيقة لا تخص هذا الطلب');
 const ids=document.type==='delivery'?order.deliveryDocumentIds:order.invoiceDocumentIds;
 if(ids.includes(document.id))throw new Error('الوثيقة مربوطة مسبقاً');
 if(document.type==='delivery')return {...order,deliveryDocumentIds:[...ids,document.id]};
 return {...order,invoiceDocumentIds:[...ids,document.id]};
}
