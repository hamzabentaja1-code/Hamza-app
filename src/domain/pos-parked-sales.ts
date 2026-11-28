import type {PosCart} from '../pos';

export type ParkedPosMethod='cash'|'card'|'transfer'|'credit';
export type ParkedPosSale={
  id:string;
  title:string;
  savedAt:string;
  warehouseId?:string;
  cart:PosCart;
  customerId:string;
  method:ParkedPosMethod;
  bankAccountId:string;
  creditPaymentMethod:'cash'|'card'|'transfer';
  creditPaidText:string;
  discountText:string;
};

export type ParkPosSaleInput=Omit<ParkedPosSale,'id'|'savedAt'>;
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const isMethod=(value:unknown):value is ParkedPosMethod=>value==='cash'||value==='card'||value==='transfer'||value==='credit';
const isPosLine=(value:unknown):value is PosCart['lines'][number]=>isRecord(value)&&typeof value.productId==='string'&&!!value.productId&&typeof value.name==='string'&&!!value.name&&typeof value.quantity==='number'&&Number.isFinite(value.quantity)&&value.quantity>0&&typeof value.unitPrice==='number'&&Number.isFinite(value.unitPrice)&&value.unitPrice>=0&&typeof value.discount==='number'&&Number.isFinite(value.discount)&&value.discount>=0;

export function createParkedPosSale(input:ParkPosSaleInput,id:string,savedAt:string):ParkedPosSale{
  if(!id.trim()||!Number.isFinite(Date.parse(savedAt)))throw new Error('معرف البيع المحفوظ أو تاريخه غير صالح.');
  if(!input.cart.lines.length)throw new Error('السلة فارغة. زيد منتج قبل حفظ البيع.');
  if(!isMethod(input.method)||!['cash','card','transfer'].includes(input.creditPaymentMethod))throw new Error('طريقة الأداء غير صالحة.');
  return {...input,id,title:input.title.trim()||'بيع محفوظ',savedAt,cart:{...input.cart,lines:input.cart.lines.map(line=>({...line}))}};
}

export function normalizeParkedPosSales(value:unknown):ParkedPosSale[]{
  if(!Array.isArray(value))return [];
  const results:ParkedPosSale[]=[];
  for(const candidate of value){
    if(results.length>=50)break;
    if(!isRecord(candidate)||!isRecord(candidate.cart)||!Array.isArray(candidate.cart.lines))continue;
    const cart=candidate.cart;
    if(!isMethod(candidate.method)||!['cash','card','transfer'].includes(String(candidate.creditPaymentMethod)))continue;
    const rawLines=cart.lines;
    if(!Array.isArray(rawLines))continue;
    const lines=rawLines.filter(isPosLine).map(line=>({...line}));
    if(!lines.length||lines.length!==rawLines.length||lines.some(line=>line.discount>line.quantity*line.unitPrice))continue;
    const id=typeof candidate.id==='string'?candidate.id:'';
    const savedAt=typeof candidate.savedAt==='string'?candidate.savedAt:'';
    if(!id||!Number.isFinite(Date.parse(savedAt)))continue;
    const globalDiscount=typeof cart.globalDiscount==='number'&&Number.isFinite(cart.globalDiscount)&&cart.globalDiscount>=0?cart.globalDiscount:0;
    const paidAmount=typeof cart.paidAmount==='number'&&Number.isFinite(cart.paidAmount)&&cart.paidAmount>=0?cart.paidAmount:0;
    const sale:ParkedPosSale={
      ...(typeof candidate.warehouseId==='string'&&candidate.warehouseId.trim()?{warehouseId:candidate.warehouseId.trim()}:{}),
      id,title:typeof candidate.title==='string'&&candidate.title.trim()?candidate.title.trim():'بيع محفوظ',savedAt,
      cart:{customerId:typeof cart.customerId==='string'?cart.customerId:undefined,lines,globalDiscount,paymentMethod:candidate.method,paidAmount},
      customerId:typeof candidate.customerId==='string'?candidate.customerId:'',method:candidate.method,
      bankAccountId:typeof candidate.bankAccountId==='string'?candidate.bankAccountId:'',
      creditPaymentMethod:candidate.creditPaymentMethod as ParkedPosSale['creditPaymentMethod'],
      creditPaidText:typeof candidate.creditPaidText==='string'?candidate.creditPaidText:'0',
      discountText:typeof candidate.discountText==='string'?candidate.discountText:String(globalDiscount),
    };
    results.push(sale);
  }
  return results;
}

/** Re-parking edits the same durable row and cannot retarget a known warehouse. */
export function saveParkedPosSale(rows:readonly ParkedPosSale[],sale:ParkedPosSale,replace:boolean):ParkedPosSale[]{
  const matches=rows.filter(row=>row.id===sale.id);
  if(!sale.warehouseId?.trim())throw new Error('اختار المخزن ديال هاد البيع.');
  if(replace?(matches.length!==1):matches.length>0)throw new Error('البيع المحفوظ ما بقاش متاح.');
  if(!replace&&rows.length>=50)throw new Error('حيد بعض المبيعات المحفوظة قبل ما تزيد أخرى.');
  if(matches[0]?.warehouseId&&matches[0].warehouseId!==sale.warehouseId)throw new Error('هاد البيع مربوط بمخزن آخر.');
  return [sale,...rows.filter(row=>row.id!==sale.id)];
}

export function parkedCheckoutError(rows:readonly ParkedPosSale[], activeWarehouseId:string, input:{
  parkedSaleId?:string;warehouseId:string;legacyWarehouseConfirmed?:boolean;
}):string|undefined {
  if(!input.warehouseId||input.warehouseId!==activeWarehouseId)return 'هاد البيع مربوط بمخزن آخر.';
  if(!input.parkedSaleId)return;
  const matches=rows.filter(row=>row.id===input.parkedSaleId);
  if(matches.length!==1)return 'البيع المحفوظ ما بقاش متاح.';
  const saved=matches[0];
  if(saved.warehouseId&&saved.warehouseId!==input.warehouseId)return 'هاد البيع مربوط بمخزن آخر.';
  if(!saved.warehouseId&&!input.legacyWarehouseConfirmed)return 'اختار المخزن ديال هاد البيع.';
}
