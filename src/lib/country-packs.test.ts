import { describe, it, expect } from "vitest";
import { resolveLocalization, getCountryPack, getFirmIdentityLines } from "./country-packs";

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

// W5: document numbering prefix + firm-identity block per pack.
describe("document numbering prefix per pack (worldwide.md W5)", () => {
  it("francophone packs keep the existing FA / DEV series", () => {
    expect(getCountryPack("MA").invoicePrefix).toBe("FA");
    expect(getCountryPack("MA").quotePrefix).toBe("DEV");
    expect(getCountryPack("DZ").invoicePrefix).toBe("FA");
    expect(getCountryPack("FR").quotePrefix).toBe("DEV");
  });

  it("Gulf / international use INV / QUO", () => {
    expect(getCountryPack("AE").invoicePrefix).toBe("INV");
    expect(getCountryPack("AE").quotePrefix).toBe("QUO");
    expect(getCountryPack("INTL").invoicePrefix).toBe("INV");
  });
});

describe("firm identity lines per pack (worldwide.md W5)", () => {
  it("Morocco prints ICE/RC/IF/Patente from the firm row, dropping empties", () => {
    const lines = getFirmIdentityLines({
      country: "MA",
      ice: "0001234567",
      rc: "RC-99",
      if_number: "",        // empty → dropped
      patente: "PAT-7",
      cnss: "X",            // not an invoice identity field
    });
    expect(lines).toEqual([
      { label: "ICE", value: "0001234567" },
      { label: "RC", value: "RC-99" },
      { label: "Patente", value: "PAT-7" },
    ]);
  });

  it("packs without identity columns yield no lines (no invented SIRET/TRN)", () => {
    expect(getFirmIdentityLines({ country: "AE", ice: "irrelevant" })).toEqual([]);
    expect(getFirmIdentityLines({ country: "FR", rc: "x" })).toEqual([]);
  });

  it("null / unknown country falls back to the Morocco identity set", () => {
    expect(getFirmIdentityLines(null)).toEqual([]);
    expect(getFirmIdentityLines({ ice: "0009" })).toEqual([{ label: "ICE", value: "0009" }]);
  });
});
