type CustomerReference={customerName?:string};
type SupplierReference={supplierName?:string};

export function canDeleteCustomer(name:string,openingBalanceCentimes:number|undefined,records:readonly (readonly CustomerReference[])[]):boolean {
  if((openingBalanceCentimes||0)>0)return false;
  return records.every(group=>!group.some(item=>item.customerName===name));
}

export function canDeleteSupplier(name:string,openingBalanceCentimes:number|undefined,records:readonly (readonly SupplierReference[])[]):boolean {
  if((openingBalanceCentimes||0)>0)return false;
  return records.every(group=>!group.some(item=>item.supplierName===name));
}
