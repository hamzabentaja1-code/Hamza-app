export type ProductStockFilter='all'|'in_stock'|'low_stock'|'out_of_stock'|'services';
export type ProductFilterRecord={id:number;name:string;reference?:string;barcode?:string;category?:string;brand?:string;unit?:string;variant?:string;kind?:'product'|'service';qty:number};
export type ProductVariantFilterRecord={productId:number;stockQty:number;active:boolean};
export function productStockQuantity(product:ProductFilterRecord,variants:ProductVariantFilterRecord[]):number{
 const linked=variants.filter(item=>item.productId===product.id&&item.active);
 return linked.length?linked.reduce((sum,item)=>sum+item.stockQty,0):product.qty;
}
export function filterProducts(products:ProductFilterRecord[],variants:ProductVariantFilterRecord[],search:string,filter:ProductStockFilter='all'):ProductFilterRecord[]{
 const query=search.trim().toLocaleLowerCase();
 return products.filter(product=>{
  const quantity=productStockQuantity(product,variants);
  const matchesSearch=!query||[product.name,product.reference||'',product.barcode||'',product.category||'',product.brand||'',product.unit||'',product.variant||''].some(value=>value.toLocaleLowerCase().includes(query));
  if(!matchesSearch)return false;
  if(filter==='services')return product.kind==='service';
  if(product.kind==='service')return false;
  if(filter==='in_stock')return quantity>0;
  if(filter==='low_stock')return quantity>0&&quantity<=5;
  if(filter==='out_of_stock')return quantity<=0;
  return true;
 });
}
