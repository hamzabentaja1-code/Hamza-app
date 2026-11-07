export function projectedCustomerBalance(
  currentOutstandingCentimes:number,
  additionalCreditCentimes:number,
):number {
  if(!Number.isSafeInteger(currentOutstandingCentimes)||
     !Number.isSafeInteger(additionalCreditCentimes)||additionalCreditCentimes<0)
    throw new Error('مبلغ الدين أو الائتمان غير صالح');
  const projected=currentOutstandingCentimes+additionalCreditCentimes;
  if(!Number.isSafeInteger(projected)) throw new Error('الرصيد المتوقع كبير بزاف');
  return projected;
}
export function exceedsCustomerCreditLimit(
  currentOutstandingCentimes:number,
  additionalCreditCentimes:number,
  creditLimitCentimes?:number,
):boolean {
  if(creditLimitCentimes===undefined) {
    projectedCustomerBalance(currentOutstandingCentimes,additionalCreditCentimes);
    return false;
  }
  if(!Number.isSafeInteger(creditLimitCentimes)||creditLimitCentimes<0)
    throw new Error('سقف ائتمان الزبون غير صالح');
  return projectedCustomerBalance(currentOutstandingCentimes,additionalCreditCentimes)>creditLimitCentimes;
}
export function calculatePaymentDueDate(issueDate:string,termsDays?:number):string|undefined {
  if(termsDays===undefined)return undefined;
  if(!Number.isSafeInteger(termsDays)||termsDays<0||!Number.isFinite(Date.parse(issueDate)))
    throw new Error('تاريخ الفاتورة أو أجل الأداء غير صالح');
  const date=new Date(issueDate);
  date.setUTCDate(date.getUTCDate()+termsDays);
  return date.toISOString().slice(0,10);
}
