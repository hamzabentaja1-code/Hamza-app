import {signedQuantity,type StockMovement} from '../inventory';

type Product = {id:number; name:string; qty:number};
type ProductReference = {productId?:string|number; productName?:string};
export type ProductDeletionBlock = 'stock'|'history';

/** Keep catalogue identity for reports, outstanding transactions and physical returns. */
export function productDeletionBlock(
  product:Product,
  movements:readonly StockMovement[],
  referenceGroups:readonly (readonly ProductReference[])[],
):ProductDeletionBlock|undefined {
  const id=String(product.id);
  const balances=new Map<string,number>();
  for(const movement of movements) {
    if(movement.productId!==id)continue;
    balances.set(movement.warehouseId,(balances.get(movement.warehouseId)??0)+signedQuantity(movement));
  }
  // Do not net one warehouse against another, or hide an inconsistent balance.
  if(product.qty!==0||[...balances.values()].some(qty=>qty!==0))return 'stock';
  if(balances.size||referenceGroups.some(group=>group.some(record=>{
    const linkedId=String(record.productId??'').trim();
    return linkedId&&linkedId!=='0'?linkedId===id:record.productName===product.name;
  })))return 'history';
}
