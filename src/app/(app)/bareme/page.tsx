import { BaremeCalculator } from "@/components/bareme/bareme-calculator";

export default function BaremePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Outils</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Barème ONA</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Calculez vos honoraires selon le barème officiel de l'Ordre National des Architectes (Loi 016-89).
        </p>
      </div>
      <BaremeCalculator />
    </div>
  );
}
