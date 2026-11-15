export type PosCatalogItem={
  id:string;
  name:string;
  reference?:string;
  barcode?:string;
  category?:string;
  stock?:number;
  salePrice?:number;
};

export function filterPosCatalogProducts<T extends PosCatalogItem>(
  products:T[],
  query:string,
  category:string,
  inStockOnly:boolean,
  limit=8,
):T[]{
  const needle=query.trim().toLocaleLowerCase();
  return products.filter(product=>
    (!needle||[product.name,product.reference||'',product.barcode||''].some(value=>value.toLocaleLowerCase().includes(needle)))&&
    (!category||product.category===category)&&
    (!inStockOnly||(product.stock??0)>0)
  ).slice(0,Math.max(0,limit));
}
