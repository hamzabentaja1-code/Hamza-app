export type QuoteLineInput = {
  productId?: string;
  description: string;
  quantity: number;
  unitPriceCentimes: number;
  discountCentimes?: number;
};

export type CalculatedQuoteLine = QuoteLineInput & {
  lineTotalCentimes: number;
};

export type CalculatedQuote = {
  lines: CalculatedQuoteLine[];
  subtotalCentimes: number;
  discountCentimes: number;
  totalCentimes: number;
};

/** Parse a decimal draft only for calculation; never replace the typed string. */
export function parseQuoteDecimal(value:string,places:2|3):number|undefined {
  const normalized=value.trim().replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)-(digit<='٩'?0x660:0x6f0))).replace(/[٫,]/g,'.');
  const parts=/^(?:(\d{1,9})(?:\.(\d{1,3}))?|\.(\d{1,3}))$/.exec(normalized);
  if(!parts)return undefined;
  const fraction=parts[2]??parts[3]??'';
  if(fraction.length>places)return undefined;
  // Return scaled integers (centimes or milli-units), avoiding float parsing.
  return Number(parts[1]??0)*10**places+Number(fraction.padEnd(places,'0'));
}

export type QuoteLineDraft={productId:number;productName:string;qtyText:string;priceText:string};

export function calculateQuoteDraft(lines:readonly QuoteLineDraft[],discountText:string):CalculatedQuote {
  const discount=discountText.trim()===''?0:parseQuoteDecimal(discountText,2);
  if(discount===undefined)throw new Error('Invalid document discount');
  return calculateQuote(lines.map(line=>{
    const quantity=parseQuoteDecimal(line.qtyText,3);
    const price=parseQuoteDecimal(line.priceText,2);
    if(quantity===undefined||price===undefined)throw new Error('Invalid quantity or price');
    return {productId:String(line.productId),description:line.productName,quantity:quantity/1000,unitPriceCentimes:price};
  }),discount);
}

function safeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(label + " must be a safe integer");
  }
  return value;
}

/**
 * Calculates a multi-line quote using integer MAD centimes.
 * Quantity supports up to three decimal places (milli-units).
 */
export function calculateQuote(
  lines: QuoteLineInput[],
  documentDiscountCentimes = 0,
): CalculatedQuote {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Add at least one product or service");
  }

  safeInteger(documentDiscountCentimes, "Document discount");
  if (documentDiscountCentimes < 0) {
    throw new Error("Document discount cannot be negative");
  }

  const calculatedLines = lines.map((line) => {
    const quantityMilli = Math.round(line.quantity * 1000);
    if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0 ||
        Math.abs(line.quantity - quantityMilli / 1000) > 0.000000001) {
      throw new Error("Quantity must be positive with at most three decimals");
    }

    safeInteger(line.unitPriceCentimes, "Unit price");
    const lineDiscount = line.discountCentimes ?? 0;
    safeInteger(lineDiscount, "Line discount");
    if (line.unitPriceCentimes < 0 || lineDiscount < 0) {
      throw new Error("Prices and discounts cannot be negative");
    }

    const gross = safeInteger(Number((BigInt(quantityMilli)*BigInt(line.unitPriceCentimes)+500n)/1000n), "Line total");
    if (lineDiscount > gross) {
      throw new Error("Line discount cannot exceed line amount");
    }
    return {
      ...line,
      discountCentimes: lineDiscount,
      lineTotalCentimes: gross - lineDiscount,
    };
  });

  const subtotalCentimes = calculatedLines.reduce(
    (sum, line) => sum + line.lineTotalCentimes,
    0,
  );
  if (!Number.isSafeInteger(subtotalCentimes)) {
    throw new Error("Quote total is too large");
  }
  if (documentDiscountCentimes > subtotalCentimes) {
    throw new Error("Document discount cannot exceed subtotal");
  }

  return {
    lines: calculatedLines,
    subtotalCentimes,
    discountCentimes: documentDiscountCentimes,
    totalCentimes: subtotalCentimes - documentDiscountCentimes,
  };
}
