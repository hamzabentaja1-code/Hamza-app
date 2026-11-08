export type CashMovementKind = 'opening'|'cash_in'|'cash_out'|'sale'|'customer_payment'|'expense'|'supplier_payment';
export type CashMovement = {id:string;kind:CashMovementKind;amountCentimes:number;date:string;note:string};

const validDate=(value:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
};

export function cashBalance(movements:CashMovement[]):number{
  return movements.reduce((balance,item)=>balance+(item.kind==='cash_out'||item.kind==='expense'||item.kind==='supplier_payment'?-item.amountCentimes:item.amountCentimes),0);
}

export function postCashMovement(movement:CashMovement,existing:CashMovement[]):CashMovement[]{
  if(!movement.id.trim()||existing.some(item=>item.id===movement.id))throw new Error('معرف حركة الصندوق غير صالح أو مستعمل');
  if(!validDate(movement.date))throw new Error('تاريخ حركة الصندوق غير صالح');
  if(!Number.isSafeInteger(movement.amountCentimes)||movement.amountCentimes<=0)throw new Error('مبلغ حركة الصندوق خاصو يكون أكبر من صفر');
  if(!['opening','cash_in','cash_out','sale','customer_payment','expense','supplier_payment'].includes(movement.kind))throw new Error('نوع حركة الصندوق غير صالح');
  if(movement.kind==='opening'&&existing.some(item=>item.kind==='opening'))throw new Error('الرصيد الافتتاحي للصندوق مسجل من قبل');
  if(['cash_out','expense','supplier_payment'].includes(movement.kind)&&movement.amountCentimes>cashBalance(existing))throw new Error('الرصيد النقدي غير كافٍ');
  return [...existing,movement];
}
