export type CreditLine = {productId:number;productName:string;qty:number;unitPrice:number;total:number};
export type CreditInvoice = {id:number;number:string;type:'invoice';sourceQuoteId:number;customerName:string;total:number;status:string;paidCentimes?:number;creditedCentimes?:number;lines:CreditLine[]};
export type CreditNote = {id:number;number:string;type:'credit_note';customerName:string;total:number;date:string;status:string;sourceQuoteId:number;sourceInvoiceId:number;lines:CreditLine[]};
export type CreditStockProduct = {id:number;qty:number};

export function createCreditNote(invoice:CreditInvoice,existing:CreditNote[],products:CreditStockProduct[],quantities:Record<string,number>,id:number,date:string){
  if(invoice.type!=='invoice'||!invoice.lines.length)throw new Error('اختار فاتورة فيها منتجات مرتبطة.');
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('رقم سند الإرجاع غير صالح.');
  const previous=existing.filter(note=>note.sourceInvoiceId===invoice.id);
  const sold=new Map<number,{qty:number;amountCentimes:number;name:string}>();
  for(const line of invoice.lines){
    if(!Number.isSafeInteger(line.productId)||line.productId<=0||!Number.isFinite(line.qty)||line.qty<=0||!Number.isFinite(line.total)||line.total<0)throw new Error('سطور الفاتورة غير صالحة للإرجاع.');
    const group=sold.get(line.productId)||{qty:0,amountCentimes:0,name:line.productName};
    group.qty+=line.qty;group.amountCentimes+=Math.round(line.total*100);sold.set(line.productId,group);
  }
  const returned=new Map<number,number>();
  for(const note of previous)for(const line of note.lines)returned.set(line.productId,(returned.get(line.productId)||0)+line.qty);
  const noteLines:CreditLine[]=[];let totalCentimes=0;
  for(const [rawId,quantity] of Object.entries(quantities)){
    const productId=Number(rawId);if(!Number.isFinite(quantity)||quantity<0)throw new Error('كمية الإرجاع غير صالحة.');
    if(quantity===0)continue;
    const group=sold.get(productId);const product=products.find(item=>item.id===productId);
    const remaining=(group?.qty||0)-(returned.get(productId)||0);
    if(!group||!product)throw new Error('المنتج غير موجود في الفاتورة أو المخزون.');
    if(quantity>remaining+1e-8)throw new Error('كمية الإرجاع أكبر من الكمية المتبقية في الفاتورة.');
    const amountCentimes=Math.round(group.amountCentimes*quantity/group.qty);
    const line:CreditLine={productId,productName:group.name,qty:quantity,unitPrice:quantity?amountCentimes/100/quantity:0,total:amountCentimes/100};
    noteLines.push(line);totalCentimes+=amountCentimes;
  }
  if(!noteLines.length||totalCentimes<=0)throw new Error('دخل كمية واحدة على الأقل للإرجاع.');
  const invoiceTotalCentimes=Math.round(invoice.total*100);
  const alreadyCredited=invoice.creditedCentimes||0;
  if(!Number.isSafeInteger(invoiceTotalCentimes)||!Number.isSafeInteger(alreadyCredited)||alreadyCredited<0||alreadyCredited+totalCentimes>invoiceTotalCentimes)throw new Error('مجموع سندات الإرجاع تجاوز قيمة الفاتورة.');
  const updatedProducts=products.map(product=>{const line=noteLines.find(item=>item.productId===product.id);return line?{...product,qty:product.qty+line.qty}:product;});
  return {note:{id,number:'AVR-'+id,type:'credit_note' as const,customerName:invoice.customerName,total:totalCentimes/100,date,status:'صادرة',sourceQuoteId:invoice.sourceQuoteId||invoice.id,sourceInvoiceId:invoice.id,lines:noteLines},updatedProducts,creditedCentimes:alreadyCredited+totalCentimes};
}
