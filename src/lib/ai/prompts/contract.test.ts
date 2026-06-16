import { describe, it, expect } from "vitest";
import {
  CONTRACT_SYSTEM_PROMPT,
  getContractPrompt,
  internationalContractSystemPrompt,
} from "./contract";

// W6: contract AI grounding per jurisdiction. Only Morocco has real (Loi 016-89)
// grounding; everything else uses a jurisdiction-neutral template.
describe("contract prompt selection (worldwide.md W6)", () => {
  const ma = { country: "MA", currency: "MAD", taxLabel: "TVA" };
  const ae = { country: "AE", currency: "AED", taxLabel: "VAT" };

  it("Morocco returns the EXISTING Loi 016-89 prompt + version, byte-identical", () => {
    const p = getContractPrompt(ma);
    expect(p.system).toBe(CONTRACT_SYSTEM_PROMPT); // flagship must not drift
    expect(p.version).toBe("v1.1");
    expect(p.jurisdiction).toBe("MA");
    expect(p.system).toContain("016-89");
  });

  it("non-Morocco selects the neutral template, tagged with its country", () => {
    const p = getContractPrompt(ae);
    expect(p.version).toBe("intl-v1.0");
    expect(p.jurisdiction).toBe("AE");
    expect(p.system).not.toBe(CONTRACT_SYSTEM_PROMPT);
  });

  it("the neutral prompt carries NO Moroccan grounding and forces placeholders + review", () => {
    const sys = internationalContractSystemPrompt({ taxLabel: "VAT", currency: "AED" });
    expect(sys).not.toContain("016-89");
    expect(sys).not.toContain("Ordre National"); // no MA professional body
    expect(sys).toContain("[À COMPLÉTER"); // governing-law placeholders
    expect(sys).toContain("conseil juridique local"); // in-body review disclaimer
    expect(sys).toContain("Avertissement"); // disclaimer is a contract SECTION (survives export)
  });

  it("the neutral prompt reflects the workspace currency + tax label", () => {
    const sys = internationalContractSystemPrompt({ taxLabel: "VAT", currency: "AED" });
    expect(sys).toContain("AED");
    expect(sys).toContain("VAT");
    expect(sys).not.toContain("TVA 20%"); // not hardcoded Moroccan tax
  });
});
