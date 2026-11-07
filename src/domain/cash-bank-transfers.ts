import {CashMovement,appendCashMovement} from './cashbook';
import {BankMovement,appendBankMovement} from './banking';

export type CashBankTransferInput={
 id:string;direction:'cash_to_bank'|'bank_to_cash';accountId:string;
 amountCentimes:number;date:string;description:string;
};

export function createCashBankTransfer(
 cashMovements:CashMovement[],
 bankMovements:BankMovement[],
 input:CashBankTransferInput,
):{cashMovements:CashMovement[];bankMovements:BankMovement[]}{
 if(!input.id.trim()||!input.accountId.trim())throw new Error('معرف التحويل والحساب البنكي مطلوبان');
 if(!Number.isSafeInteger(input.amountCentimes)||input.amountCentimes<=0)throw new Error('مبلغ التحويل خاصو يكون موجب وبالسنتيم');
 if(!Number.isFinite(Date.parse(input.date))||!input.description.trim())throw new Error('تاريخ ووصف التحويل مطلوبان');
 const cash:CashMovement={id:input.id+'-cash',kind:input.direction==='cash_to_bank'?'cash_out':'cash_in',amountCentimes:input.amountCentimes,date:input.date,description:input.description,reference:input.id};
 const bank:BankMovement={id:input.id+'-bank',accountId:input.accountId,kind:input.direction==='cash_to_bank'?'cash_transfer_in':'cash_transfer_out',amountCentimes:input.amountCentimes,date:input.date,description:input.description,transferId:input.id,sourceId:input.id};
 // Build both new ledgers before returning; a failure in either side leaves both originals untouched.
 const nextCash=appendCashMovement(cashMovements,cash);
 const nextBank=appendBankMovement(bankMovements,bank);
 return {cashMovements:nextCash,bankMovements:nextBank};
}
