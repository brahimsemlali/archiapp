import { describe, it, expect } from "vitest";
import { resolveLocalization, getCountryPack } from "./country-packs";

// W1/W4: the tax label is a property of the JURISDICTION (pack), not the UI language.
describe("country pack → tax label / currency (worldwide.md W1+W4)", () => {
  it("Morocco resolves to TVA / MAD (historical default)", () => {
    const loc = resolveLocalization({ country: "MA" });
    expect(loc.taxLabel).toBe("TVA");
    expect(loc.currency).toBe("MAD");
    expect(loc.defaultTaxRate).toBe(20);
  });

  it("Gulf packs resolve to VAT with their own rate (the worldwide point)", () => {
    expect(resolveLocalization({ country: "AE" }).taxLabel).toBe("VAT");
    expect(resolveLocalization({ country: "AE" }).defaultTaxRate).toBe(5);
    expect(resolveLocalization({ country: "SA" }).taxLabel).toBe("VAT");
    expect(resolveLocalization({ country: "SA" }).defaultTaxRate).toBe(15);
  });

  it("francophone Maghreb keeps TVA at the local rate", () => {
    expect(resolveLocalization({ country: "DZ" }).taxLabel).toBe("TVA");
    expect(resolveLocalization({ country: "DZ" }).defaultTaxRate).toBe(19);
    expect(resolveLocalization({ country: "TN" }).taxLabel).toBe("TVA");
  });

  it("falls back to the Morocco pack for null / unknown country", () => {
    expect(resolveLocalization(null).taxLabel).toBe("TVA");
    expect(resolveLocalization({ country: "ZZ" }).taxLabel).toBe("TVA");
    expect(getCountryPack("ZZ").code).toBe("MA");
  });

  it("a stored currency overrides the pack default; tax label still follows the pack", () => {
    const loc = resolveLocalization({ country: "MA", currency: "EUR" });
    expect(loc.currency).toBe("EUR");
    expect(loc.taxLabel).toBe("TVA");
  });
});
