export type StockFilterStatus='all'|'low'|'out'|'services';
export type StockFilterSort='name'|'quantity'|'price';
export type StockFilterProduct={
 id:number;name:string;price:number;stock:number;kind?:'product'|'service';
 reference?:string;barcode?:string;category?:string;brand?:string;unit?:string;variant?:string;
};
export type StockFilterOptions={query?:string;category?:string;status?:StockFilterStatus;sort?:StockFilterSort};

export function filterStockProducts<T extends StockFilterProduct>(products:T[],options:StockFilterOptions={}):T[]{
 const query=(options.query||'').trim().toLocaleLowerCase();
 const category=options.category||'';
 const status=options.status||'all';
 const sort=options.sort||'name';
 const filtered=products.filter(product=>{
  if(query&&!([product.name,product.reference||'',product.barcode||'',product.category||'',product.brand||'',product.unit||'',product.variant||''].some(value=>value.toLocaleLowerCase().includes(query))))return false;
  if(category&&product.category!==category)return false;
  if(status==='services')return product.kind==='service';
  if(status==='low')return product.kind!=='service'&&product.stock>0&&product.stock<=5;
  if(status==='out')return product.kind!=='service'&&product.stock<=0;
  return true;
 });
 return filtered.sort((a,b)=>sort==='quantity'?a.stock-b.stock:sort==='price'?a.price-b.price:a.name.localeCompare(b.name));
}
