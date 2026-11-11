export type CostedSale = {id:number;qty:number;total:number;unitCost?:number};
export type CostedReturn = {saleId:number;qty:number;total:number;restocked:boolean};

export type ProfitLossSummary = {
  revenue:number;
  costOfGoodsSold:number;
  grossProfitOnCostedSales:number;
  expenses:number;
  netProfitOnCostedSales:number;
  uncostedRevenue:number;
};

/** Uses the unit cost captured on each sale; old records without a cost remain visibly uncosted. */
export function calculateProfitLoss(
  sales:readonly CostedSale[],
  returns:readonly CostedReturn[],
  expenses:readonly {amount:number}[],
):ProfitLossSummary {
  const knownSales=sales.filter(sale=>Number.isFinite(sale.unitCost)&&sale.unitCost!>=0);
  const knownIds=new Set(knownSales.map(sale=>sale.id));
  const returnedFor=(saleId:number)=>returns.filter(item=>item.saleId===saleId);
  const revenue=sales.reduce((sum,sale)=>sum+sale.total,0)-returns.reduce((sum,item)=>sum+item.total,0);
  const costOfGoodsSold=knownSales.reduce((sum,sale)=>{
    const cost=sale.qty*sale.unitCost!;
    const restocked=returnedFor(sale.id).filter(item=>item.restocked).reduce((subtotal,item)=>subtotal+item.qty*sale.unitCost!,0);
    return sum+Math.max(0,cost-restocked);
  },0);
  const uncostedRevenue=sales.filter(sale=>!Number.isFinite(sale.unitCost)||sale.unitCost!<0).reduce((sum,sale)=>sum+sale.total,0);
  const costedRevenue=knownSales.reduce((sum,sale)=>sum+sale.total-returnedFor(sale.id).reduce((subtotal,item)=>subtotal+item.total,0),0);
  // Returns tied to old, uncosted sales must not be attributed to the costed subset.
  const uncostedReturnRevenue=returns.filter(item=>!knownIds.has(item.saleId)).reduce((sum,item)=>sum+item.total,0);
  const grossProfitOnCostedSales=costedRevenue-costOfGoodsSold;
  const expenseTotal=expenses.reduce((sum,item)=>sum+item.amount,0);
  return {
    revenue:Math.max(0,revenue),
    costOfGoodsSold,
    grossProfitOnCostedSales,
    expenses:expenseTotal,
    netProfitOnCostedSales:grossProfitOnCostedSales-expenseTotal,
    uncostedRevenue:Math.max(0,uncostedRevenue-uncostedReturnRevenue),
  };
}
