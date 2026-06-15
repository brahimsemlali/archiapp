import { describe, it, expect } from "vitest";
import { formatMAD, formatMoney, inputToCentimes, centimsToInput, formatFileSize, formatDate, formatDateShort, formatDayMonth } from "./format";

describe("money formatting (centimes ↔ display)", () => {
  it("formatMAD renders 2 decimals and the DH suffix", () => {
    const s = formatMAD(123456); // 1234.56 MAD
    expect(s.endsWith(" DH")).toBe(true);
    expect(s).toContain("1");
    expect(s).toContain("56");
  });

  it("formatMAD handles zero", () => {
    expect(formatMAD(0)).toContain("0,00");
  });

  it("formatMoney defaults to MAD and matches formatMAD exactly", () => {
    for (const cents of [0, 1, 99, 123456, 9999999]) {
      expect(formatMoney(cents)).toBe(formatMAD(cents));
    }
  });

  it("formatMoney renders Maghreb suffix currencies", () => {
    expect(formatMoney(123456, "DZD").endsWith(" DA")).toBe(true);
    expect(formatMoney(123456, "TND").endsWith(" DT")).toBe(true);
  });

  it("formatMoney renders Intl-style currencies", () => {
    expect(formatMoney(123456, "EUR")).toContain("€");
    expect(formatMoney(123456, "USD")).toContain("$");
    const aed = formatMoney(123456, "AED");
    expect(aed).toMatch(/AED|د\.إ/);
  });

  it("formatMoney falls back gracefully on unknown currency codes", () => {
    expect(formatMoney(123456, "GBP")).toContain("£");
  });

  it("inputToCentimes parses a decimal string to integer centimes", () => {
    expect(inputToCentimes("1234.56")).toBe(123456);
    expect(inputToCentimes("0")).toBe(0);
    expect(inputToCentimes("99.99")).toBe(9999);
  });

  it("centimsToInput ↔ inputToCentimes round-trips", () => {
    for (const cents of [0, 1, 99, 100, 123456, 9999999]) {
      expect(inputToCentimes(centimsToInput(cents))).toBe(cents);
    }
  });
});

describe("locale-aware date formatting (W2)", () => {
  // Midday UTC — same calendar day in every timezone we care about
  const day = "2026-06-15T12:00:00Z";

  it("formatDate localizes the month name, keeping day-first order in every locale", () => {
    expect(formatDate(day, "fr")).toBe("15 juin 2026");
    expect(formatDate(day, "en")).toBe("15 June 2026");
    expect(formatDate(day, "ar")).toBe("15 يونيو 2026"); // Arabic month, Latin digits
  });

  it("formatDate defaults to French (unchanged historical output)", () => {
    expect(formatDate(day)).toBe("15 juin 2026");
  });

  it("formatDateShort stays dd/MM/yyyy in all locales (no en-US MM/dd flip)", () => {
    expect(formatDateShort(day, "fr")).toBe("15/06/2026");
    expect(formatDateShort(day, "en")).toBe("15/06/2026");
    expect(formatDateShort(day, "ar")).toBe("15/06/2026");
  });

  it("formatDayMonth is day + short month, no year", () => {
    expect(formatDayMonth(day, "fr")).toBe("15 juin");
    expect(formatDayMonth(day, "en")).toBe("15 Jun");
  });

  it("renders the Africa/Casablanca calendar day for a near-midnight UTC timestamp", () => {
    // 23:30 UTC = 00:30 next day in Casablanca (UTC+1) → the 16th, not the 15th
    const nearMidnight = "2026-06-15T23:30:00Z";
    expect(formatDate(nearMidnight, "fr")).toBe("16 juin 2026");
    // explicit UTC timezone yields the 15th — proves tz is actually applied
    expect(formatDate(nearMidnight, "fr", "UTC")).toBe("15 juin 2026");
  });
});

describe("formatFileSize", () => {
  it("uses French units o / Ko / Mo / Go", () => {
    expect(formatFileSize(512)).toBe("512 o");
    expect(formatFileSize(2048)).toBe("2.0 Ko");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 Mo");
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe("3.0 Go");
  });
});
