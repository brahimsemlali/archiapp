import { describe, it, expect } from "vitest";
import { formatMAD, inputToCentimes, centimsToInput, formatFileSize } from "./format";

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

describe("formatFileSize", () => {
  it("uses French units o / Ko / Mo / Go", () => {
    expect(formatFileSize(512)).toBe("512 o");
    expect(formatFileSize(2048)).toBe("2.0 Ko");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 Mo");
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe("3.0 Go");
  });
});
