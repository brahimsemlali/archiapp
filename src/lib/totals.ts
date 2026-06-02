/**
 * Pure money math for devis & factures. Money is always integers in centimes;
 * TVA is computed on the subtotal (Moroccan invoicing). Kept dependency-free so it
 * can be unit-tested in isolation — this is the path a bug would be most costly on.
 */
export interface LineItem {
  quantity: number;
  unitPriceCentimes: number;
}

export interface DocumentTotals {
  subtotalCentimes: number;
  tvaCentimes: number;
  totalCentimes: number;
}

export function computeDocumentTotals(
  items: ReadonlyArray<LineItem>,
  tvaRate: number
): DocumentTotals {
  const subtotalCentimes = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCentimes),
    0
  );
  const tvaCentimes = Math.round((subtotalCentimes * tvaRate) / 100);
  return { subtotalCentimes, tvaCentimes, totalCentimes: subtotalCentimes + tvaCentimes };
}
