import { describe, it, expect } from "vitest";
import { computeDocumentTotals } from "./totals";

describe("computeDocumentTotals (TVA / centimes math)", () => {
  it("computes subtotal, 20% TVA, and total for a single line", () => {
    // 1 × 1000.00 MAD = 100000 centimes; TVA 20% = 20000; total 120000
    const t = computeDocumentTotals([{ quantity: 1, unitPriceCentimes: 100000 }], 20);
    expect(t).toEqual({ subtotalCentimes: 100000, tvaCentimes: 20000, totalCentimes: 120000 });
  });

  it("sums multiple lines before applying TVA", () => {
    const t = computeDocumentTotals(
      [
        { quantity: 2, unitPriceCentimes: 50000 },
        { quantity: 3, unitPriceCentimes: 10000 },
      ],
      20
    );
    // 100000 + 30000 = 130000 subtotal; TVA 26000; total 156000
    expect(t.subtotalCentimes).toBe(130000);
    expect(t.tvaCentimes).toBe(26000);
    expect(t.totalCentimes).toBe(156000);
  });

  it("rounds each line to the nearest centime (fractional quantity)", () => {
    // 1.5 × 333 = 499.5 -> rounds to 500 centimes per line
    const t = computeDocumentTotals([{ quantity: 1.5, unitPriceCentimes: 333 }], 20);
    expect(t.subtotalCentimes).toBe(500);
    expect(t.tvaCentimes).toBe(100);
    expect(t.totalCentimes).toBe(600);
  });

  it("handles a zero TVA rate", () => {
    const t = computeDocumentTotals([{ quantity: 1, unitPriceCentimes: 99999 }], 0);
    expect(t).toEqual({ subtotalCentimes: 99999, tvaCentimes: 0, totalCentimes: 99999 });
  });

  it("returns all zeros for an empty document", () => {
    expect(computeDocumentTotals([], 20)).toEqual({ subtotalCentimes: 0, tvaCentimes: 0, totalCentimes: 0 });
  });

  it("rounds TVA to the nearest centime", () => {
    // subtotal 333 × 20% = 66.6 -> 67
    const t = computeDocumentTotals([{ quantity: 1, unitPriceCentimes: 333 }], 20);
    expect(t.tvaCentimes).toBe(67);
    expect(t.totalCentimes).toBe(400);
  });
});
