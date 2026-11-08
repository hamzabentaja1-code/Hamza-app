export type SaleForProfit={total:number;qty:number;costPrice?:number};

export function calculateSalesProfit(sales:SaleForProfit[]){
  return sales.reduce((result,sale)=>{
    if(!Number.isFinite(sale.total)||sale.total<0||!Number.isFinite(sale.qty)||sale.qty<=0){
      result.untrackedTransactions++;
      return result;
    }
    if(sale.costPrice===undefined){
      result.untrackedTransactions++;
      return result;
    }
    if(!Number.isFinite(sale.costPrice)||sale.costPrice<0){
      result.untrackedTransactions++;
      return result;
    }
    result.trackedTransactions++;
    result.grossProfitCentimes+=Math.round(sale.total*100)-Math.round(sale.costPrice*100)*sale.qty;
    return result;
  },{grossProfitCentimes:0,trackedTransactions:0,untrackedTransactions:0});
}
