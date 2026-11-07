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
export type QuoteOrderSource={id:number;number?:string;productName:string;customerName:string;qty:number;unitPrice:number;total:number;date?:string;notes?:string;documentDiscount?:number;lines?:Array<{productId:number;productName:string;qty:number;unitPrice:number;total:number;variantId?:string;variantLabel?:string;trackStock?:boolean;lineType?:'section'}>};
export function createCustomerOrderFromQuote(quote:QuoteOrderSource,id:number,number:string,date:string):CustomerOrder{
 const sourceLines=quote.lines?.filter(line=>line.lineType!=='section')||[];
 let lines:CustomerOrderLine[];
 if(sourceLines.length){
  const subtotalCentimes=sourceLines.reduce((sum,line)=>sum+Math.round(line.total*100),0);
  const discountCentimes=Math.round((quote.documentDiscount||0)*100);
  if(!Number.isSafeInteger(subtotalCentimes)||subtotalCentimes<0||!Number.isSafeInteger(discountCentimes)||discountCentimes<0||discountCentimes>subtotalCentimes)throw new Error('تخفيض الطلب غير صالح');
  let remainingDiscount=discountCentimes;
  lines=sourceLines.map((line,index)=>{
   const gross=Math.round(line.total*100);
   const allocated=index===sourceLines.length-1?remainingDiscount:subtotalCentimes?Math.min(remainingDiscount,Math.round(discountCentimes*gross/subtotalCentimes)):0;
   remainingDiscount-=allocated;
   return {productId:line.productId,productName:line.productName,qty:line.qty,unitPrice:(gross-allocated)/100/line.qty,variantId:line.variantId,variantLabel:line.variantLabel,fulfilledQty:0,trackStock:line.trackStock!==false};
  });
 }else{
  if(!validQty(quote.qty))throw new Error('كمية الطلب غير صالحة');
  lines=[{productId:0,productName:quote.productName,qty:quote.qty,unitPrice:quote.total/quote.qty,fulfilledQty:0,trackStock:false}];
 }
 return createCustomerOrder({id,number,customerName:quote.customerName,date,total:quote.total,sourceQuoteId:quote.id,lines,notes:quote.notes});
}
export function changeCustomerOrderStatus(order:CustomerOrder,status:CustomerOrderStatus):CustomerOrder{
 if(order.status==='cancelled'||order.status==='fulfilled')throw new Error('لا يمكن تغيير حالة طلب مغلق');
 if(status==='confirmed'&&order.status!=='draft')throw new Error('لا يمكن تأكيد الطلب مرة أخرى');
 if(status==='cancelled'&&order.lines.some(line=>line.fulfilledQty>0))throw new Error('لا يمكن إلغاء طلب تسلمت منه كمية');
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
