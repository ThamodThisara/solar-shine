import { ValidationError, str, nonNegativeNumber } from './validate.js';

/** Most line items one quotation may hold (keeps an update within one transaction's operation budget). */
export const MAX_QUOTATION_ITEMS = 40;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Validates raw line items from the client and computes every figure
 * server-side — the client's own totals are never trusted.
 *
 *   gross       = Σ quantity × unit_price
 *   discount    = Σ line discount (a currency amount, not a percentage)
 *   tax         = (gross − discount) × tax_rate / 100
 *   grand total = gross − discount + tax
 */
export function computeQuotation(rawItems, rawTaxRate) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ValidationError('Add at least one line item');
  }
  if (rawItems.length > MAX_QUOTATION_ITEMS) {
    throw new ValidationError(`A quotation can have at most ${MAX_QUOTATION_ITEMS} line items`);
  }

  const taxRate = nonNegativeNumber(rawTaxRate, 'Tax rate') ?? 0;
  if (taxRate > 100) throw new ValidationError('Tax rate cannot exceed 100%');

  let gross = 0;
  let discountTotal = 0;

  const items = rawItems.map((raw, index) => {
    const label = `Item ${index + 1}`;
    if (!raw || typeof raw !== 'object') throw new ValidationError(`${label} is invalid`);

    const quantity = nonNegativeNumber(raw.quantity, `${label} quantity`);
    if (!quantity) throw new ValidationError(`${label} quantity must be greater than zero`);
    if (quantity > 1_000_000) throw new ValidationError(`${label} quantity is too large`);

    const unitPrice = nonNegativeNumber(raw.unit_price, `${label} unit price`);
    if (unitPrice === null) throw new ValidationError(`${label} unit price is required`);
    if (unitPrice > 10_000_000_000) throw new ValidationError(`${label} unit price is too large`);

    const lineGross = round2(quantity * unitPrice);
    const discount = nonNegativeNumber(raw.discount, `${label} discount`) ?? 0;
    if (discount > lineGross) throw new ValidationError(`${label} discount exceeds the line amount`);

    gross += lineGross;
    discountTotal += discount;

    return {
      product_id: str(raw.product_id, `${label} product`, { max: 36 }),
      description: str(raw.description, `${label} description`, { max: 1000, required: true }),
      quantity,
      unit: str(raw.unit, `${label} unit`, { max: 20 }),
      unit_price: unitPrice,
      discount: round2(discount),
      line_total: round2(lineGross - discount),
      sort_order: index,
    };
  });

  const taxable = gross - discountTotal;
  const taxTotal = round2((taxable * taxRate) / 100);

  return {
    items,
    tax_rate: taxRate,
    subtotal: round2(gross),
    discount_total: round2(discountTotal),
    tax_total: taxTotal,
    grand_total: round2(taxable + taxTotal),
  };
}
