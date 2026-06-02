import { describe, it, expect } from "vitest";
import { devisFormSchema } from "./devis";

const validClientId = "123e4567-e89b-42d3-a456-426614174000";

function baseInput() {
  return {
    title: "Mission complète",
    clientId: validClientId,
    items: [{ id: "a", description: "Esquisse", quantity: 1, unit: "forfait", unitPriceCentimes: 100000 }],
    tvaRate: 20,
  };
}

describe("devisFormSchema", () => {
  it("accepts a valid devis", () => {
    const r = devisFormSchema.safeParse(baseInput());
    expect(r.success).toBe(true);
  });

  it("defaults tvaRate to 20 and unit to 'forfait'", () => {
    const input = baseInput();
    const parsed = devisFormSchema.parse({
      ...input,
      tvaRate: undefined,
      items: [{ id: "a", description: "X", quantity: 1, unitPriceCentimes: 1000 }],
    });
    expect(parsed.tvaRate).toBe(20);
    expect(parsed.items[0]?.unit).toBe("forfait");
  });

  it("rejects an empty item list", () => {
    const r = devisFormSchema.safeParse({ ...baseInput(), items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    const r = devisFormSchema.safeParse({
      ...baseInput(),
      items: [{ id: "a", description: "X", quantity: 0, unit: "forfait", unitPriceCentimes: 1000 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const r = devisFormSchema.safeParse({
      ...baseInput(),
      items: [{ id: "a", description: "X", quantity: 1, unit: "forfait", unitPriceCentimes: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a missing/invalid client id", () => {
    expect(devisFormSchema.safeParse({ ...baseInput(), clientId: "" }).success).toBe(false);
    expect(devisFormSchema.safeParse({ ...baseInput(), clientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a malformed validUntil date", () => {
    const r = devisFormSchema.safeParse({ ...baseInput(), validUntil: "2026/01/01" });
    expect(r.success).toBe(false);
  });
});
