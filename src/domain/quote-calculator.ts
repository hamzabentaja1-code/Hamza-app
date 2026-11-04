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
    if (!Number.isFinite(line.quantity) || quantityMilli <= 0 ||
        Math.abs(line.quantity * 1000 - quantityMilli) > 0.000001) {
      throw new Error("Quantity must be positive with at most three decimals");
    }

    safeInteger(line.unitPriceCentimes, "Unit price");
    const lineDiscount = line.discountCentimes ?? 0;
    safeInteger(lineDiscount, "Line discount");
    if (line.unitPriceCentimes < 0 || lineDiscount < 0) {
      throw new Error("Prices and discounts cannot be negative");
    }

    const gross = Math.round((quantityMilli * line.unitPriceCentimes) / 1000);
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
