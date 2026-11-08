export type SupplierPriceObservation={productId:string;productName:string;supplierId:string;supplierName:string;unitCost:number;date:string};
export type SupplierPriceOption=SupplierPriceObservation&{best:boolean};
export type SupplierPriceComparison={productId:string;productName:string;options:SupplierPriceOption[];saving:number};

function dateKey(value:string):string{
  if(/^\d{4}-\d{2}-\d{2}/.test(value))return value.slice(0,10);
  const local=value.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if(local)return `${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`;
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?'':parsed.toISOString().slice(0,10);
}

export function compareSupplierPrices(observations:SupplierPriceObservation[]):SupplierPriceComparison[]{
  const latest=new Map<string,SupplierPriceObservation>();
  for(const item of observations){
    const date=dateKey(item.date);
    if(!item.productId||!item.supplierId||!Number.isFinite(item.unitCost)||item.unitCost<0||!date)continue;
    const normalized={...item,date};
    const key=`${item.productId}\u0000${item.supplierId}`;
    const current=latest.get(key);
    if(!current||date>current.date||(date===current.date&&item.unitCost<current.unitCost))latest.set(key,normalized);
  }
  const groups=new Map<string,SupplierPriceObservation[]>();
  for(const item of latest.values())groups.set(item.productId,[...(groups.get(item.productId)||[]),item]);
  return [...groups.entries()].map(([productId,items])=>{
    items.sort((a,b)=>a.unitCost-b.unitCost||a.supplierName.localeCompare(b.supplierName));
    const minimum=items[0]?.unitCost||0;
    return {productId,productName:items[0]?.productName||'',options:items.map((item,index)=>({...item,best:index===0})),saving:items.length>1?items[items.length-1].unitCost-minimum:0};
  }).sort((a,b)=>a.productName.localeCompare(b.productName));
}
