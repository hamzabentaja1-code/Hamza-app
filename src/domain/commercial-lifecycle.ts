export type TrackedSalesDocument={type:'customer_order'|'proforma';status:string;sourceQuoteId:number};

const transitions:Record<TrackedSalesDocument['type'],Record<string,string[]>>={
  customer_order:{'مؤكد':['قيد التجهيز','ملغى'],'قيد التجهيز':['جاهز','ملغى'],'جاهز':['مسلم','ملغى'],'مسلم':[],'ملغى':[]},
  proforma:{'أولية':['مقبولة','مرفوضة','ملغاة'],'مقبولة':[],'مرفوضة':[],'ملغاة':[]},
};

export function changeTrackedSalesDocumentStatus(
  document:TrackedSalesDocument,
  next:string,
  hasDeliveryForQuote:boolean,
):TrackedSalesDocument{
  if(!transitions[document.type]?.[document.status]?.includes(next))throw new Error('تغيير حالة الوثيقة غير مسموح');
  if(document.type==='customer_order'&&next==='مسلم'&&!hasDeliveryForQuote)throw new Error('سجل سند الخروج قبل اعتبار الطلب مسلماً');
  return {...document,status:next};
}
