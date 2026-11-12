export type BankAccount={id:string;name:string;openingBalanceCentimes:number;openingDate:string};
export type BankTransfer={id:string;bankAccountId:string;date:string;direction:'cash_to_bank'|'bank_to_cash';amountCentimes:number;description:string};

export function normalizeBankAccounts(value:unknown):BankAccount[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),names=new Set<string>();
  return value.flatMap(item=>{
    if(typeof item!=='object'||item===null)return [];
    const account=item as Partial<BankAccount>;
    const id=typeof account.id==='string'?account.id.trim():'';
    const name=typeof account.name==='string'?account.name.trim():'';
    if(!id||!name||ids.has(id)||names.has(name.toLocaleLowerCase())||!Number.isSafeInteger(account.openingBalanceCentimes)||Number(account.openingBalanceCentimes)<0||typeof account.openingDate!=='string')return [];
    ids.add(id);names.add(name.toLocaleLowerCase());
    return [{id,name,openingBalanceCentimes:Number(account.openingBalanceCentimes),openingDate:account.openingDate}];
  });
}

export function normalizeBankTransfers(value:unknown,accounts:readonly BankAccount[]):BankTransfer[]{
  if(!Array.isArray(value))return [];
  const accountIds=new Set(accounts.map(account=>account.id)),ids=new Set<string>();
  return value.flatMap(item=>{
    if(typeof item!=='object'||item===null)return [];
    const transfer=item as Partial<BankTransfer>;
    const id=typeof transfer.id==='string'?transfer.id.trim():'';
    const description=typeof transfer.description==='string'?transfer.description.trim():'';
    if(!id||ids.has(id)||typeof transfer.bankAccountId!=='string'||!accountIds.has(transfer.bankAccountId)||typeof transfer.date!=='string'||!transfer.date.trim()||(transfer.direction!=='cash_to_bank'&&transfer.direction!=='bank_to_cash')||!Number.isSafeInteger(transfer.amountCentimes)||Number(transfer.amountCentimes)<=0||!description)return [];
    ids.add(id);
    return [{id,bankAccountId:transfer.bankAccountId,date:transfer.date,direction:transfer.direction,amountCentimes:Number(transfer.amountCentimes),description}];
  });
}

export function createBankAccount(input:{id:string;name:string;openingBalance:number;openingDate:string},accounts:readonly BankAccount[]):BankAccount{
  const id=input.id.trim(),name=input.name.trim(),amount=Math.round(input.openingBalance*100);
  if(!id||accounts.some(account=>account.id===id))throw new Error('معرف الحساب البنكي غير صالح أو مستعمل.');
  if(!name||accounts.some(account=>account.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('اسم الحساب البنكي مطلوب وما خاصوش يكون مكرر.');
  if(!Number.isFinite(input.openingBalance)||input.openingBalance<0||!Number.isSafeInteger(amount))throw new Error('الرصيد الافتتاحي البنكي غير صالح.');
  if(!input.openingDate.trim())throw new Error('تاريخ الرصيد البنكي مطلوب.');
  return {id,name,openingBalanceCentimes:amount,openingDate:input.openingDate};
}

export function renameBankAccount(accounts:readonly BankAccount[],accountId:string,nameValue:string):BankAccount[]{
  const name=nameValue.trim(),account=accounts.find(item=>item.id===accountId);
  if(!account)throw new Error('اختار حساب بنكي موجود.');
  if(!name||accounts.some(item=>item.id!==accountId&&item.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('اسم الحساب البنكي مطلوب وما خاصوش يكون مكرر.');
  return accounts.map(item=>item.id===accountId?{...item,name}:item);
}

export function deleteBankAccount(accounts:readonly BankAccount[],transfers:readonly BankTransfer[],accountId:string):BankAccount[]{
  if(!accounts.some(item=>item.id===accountId))throw new Error('اختار حساب بنكي موجود.');
  if(transfers.some(item=>item.bankAccountId===accountId))throw new Error('ما يمكنش تحذف حساب مرتبط بتحويلات محفوظة.');
  return accounts.filter(item=>item.id!==accountId);
}

export function calculateBankBalance(account:BankAccount,transfers:readonly BankTransfer[]):number{
  return account.openingBalanceCentimes+transfers.filter(item=>item.bankAccountId===account.id).reduce((sum,item)=>sum+(item.direction==='cash_to_bank'?item.amountCentimes:-item.amountCentimes),0);
}

export function recordBankTransfer(input:{id:string;bankAccountId:string;date:string;direction:BankTransfer['direction'];amount:number;description:string},accounts:readonly BankAccount[],transfers:readonly BankTransfer[],cashBalanceCentimes:number):BankTransfer{
  const account=accounts.find(item=>item.id===input.bankAccountId);
  if(!account)throw new Error('اختار حساب بنكي موجود.');
  if(!input.id.trim()||transfers.some(item=>item.id===input.id))throw new Error('معرف التحويل غير صالح أو مستعمل.');
  if(!input.date.trim()||!input.description.trim())throw new Error('دخل تاريخ ووصف التحويل.');
  const amountCentimes=Math.round(input.amount*100);
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('مبلغ التحويل خاصو يكون أكبر من صفر.');
  if(input.direction==='cash_to_bank'&&amountCentimes>cashBalanceCentimes)throw new Error('المبلغ أكبر من رصيد الصندوق المتوفر.');
  if(input.direction==='bank_to_cash'&&amountCentimes>calculateBankBalance(account,transfers))throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');
  return {id:input.id.trim(),bankAccountId:account.id,date:input.date,direction:input.direction,amountCentimes,description:input.description.trim()};
}
