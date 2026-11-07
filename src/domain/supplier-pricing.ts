export type SupplierPriceRule={id:string;supplierId:number;productId:number;variantId?:string;unitCostCentimes:number;updatedAt:string};
const validRule=(value:unknown):value is SupplierPriceRule=>{
 if(!value||typeof value!=='object')return false;
 const item=value as Partial<SupplierPriceRule>;
 return typeof item.id==='string'&&item.id.trim().length>0&&Number.isSafeInteger(item.supplierId)&&Number(item.supplierId)>0&&Number.isSafeInteger(item.productId)&&Number(item.productId)>0&&(item.variantId===undefined||typeof item.variantId==='string')&&Number.isSafeInteger(item.unitCostCentimes)&&Number(item.unitCostCentimes)>=0&&typeof item.updatedAt==='string'&&Number.isFinite(Date.parse(item.updatedAt));
};
export function normalizeSupplierPriceRules(value:unknown):SupplierPriceRule[]{
 if(!Array.isArray(value))return [];
 const result:SupplierPriceRule[]=[];
 for(const candidate of value){
  if(!validRule(candidate))continue;
  const index=result.findIndex(item=>item.supplierId===candidate.supplierId&&item.productId===candidate.productId&&(item.variantId||'')===(candidate.variantId||''));
  if(index<0)result.push({...candidate});
  else if(Date.parse(candidate.updatedAt)>=Date.parse(result[index].updatedAt))result[index]={...candidate};
 }
 return result;
}
export function upsertSupplierPriceRule(rules:SupplierPriceRule[],rule:SupplierPriceRule):SupplierPriceRule[]{
 if(!validRule(rule))throw new Error('قاعدة ثمن المورد غير صالحة');
 const normalized=normalizeSupplierPriceRules(rules);
 return [...normalized.filter(item=>!(item.supplierId===rule.supplierId&&item.productId===rule.productId&&(item.variantId||'')===(rule.variantId||''))),{...rule}];
}
export function findSupplierPriceRule(rules:SupplierPriceRule[],supplierId:number,productId:number,variantId?:string):SupplierPriceRule|undefined{
 return normalizeSupplierPriceRules(rules).find(item=>item.supplierId===supplierId&&item.productId===productId&&(item.variantId||'')===(variantId||''));
}
