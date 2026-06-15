import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

const MESSAGES = { fr, en, ar } as const;

// W3: phase / project-status / deliverable labels are i18n-driven (DB keys stay stable).
describe("phase labels translate per locale (worldwide.md W3)", () => {
  it("translates the phase key, not just French", () => {
    const tFr = createTranslator({ locale: "fr", messages: fr, namespace: "phase" });
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "phase" });
    const tAr = createTranslator({ locale: "ar", messages: ar, namespace: "phase" });
    expect(tFr("esquisse")).toBe("Esquisse");
    expect(tEn("esquisse")).toBe("Sketch");
    expect(tAr("reception")).toBe("الاستلام");
    // the permit stage that has no clean RIBA equivalent — honest pipeline label
    expect(tEn("pc")).toBe("Building Permit");
  });

  it("includes the time-module 'autre' key in every locale", () => {
    for (const loc of ["fr", "en", "ar"] as const) {
      const t = createTranslator({ locale: loc, messages: MESSAGES[loc], namespace: "phase" });
      expect(t.has("autre")).toBe(true);
    }
  });

  it("project status translates", () => {
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "status.project" });
    expect(tEn("actif")).toBe("Active");
    expect(tEn("en_attente")).toBe("On Hold");
    expect(tEn.has("termine")).toBe(true);
  });
});

describe("phase deliverables seed defaults via t.raw() arrays", () => {
  it("returns a localized string array per phase", () => {
    const tFr = createTranslator({ locale: "fr", messages: fr, namespace: "phaseDeliverables" });
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "phaseDeliverables" });
    const frEsquisse = tFr.raw("esquisse") as string[];
    const enEsquisse = tEn.raw("esquisse") as string[];
    expect(Array.isArray(frEsquisse)).toBe(true);
    expect(frEsquisse[0]).toBe("Esquisse architecturale");
    expect(enEsquisse[0]).toBe("Architectural sketch");
  });

  it("covers all 8 project phases in every locale", () => {
    const keys = ["esquisse", "aps", "apd", "pc", "dce", "chantier", "reception", "termine"];
    for (const loc of ["fr", "en", "ar"] as const) {
      const t = createTranslator({ locale: loc, messages: MESSAGES[loc], namespace: "phaseDeliverables" });
      for (const k of keys) {
        expect(Array.isArray(t.raw(k)), `${loc}.${k}`).toBe(true);
      }
    }
  });
});
