"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PenLine, Trash2, CheckCircle2 } from "lucide-react";
import { saveSignatureAction } from "@/lib/actions/signatures";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  contractId: string;
  contractTitle: string;
  portalToken: string;
  onSigned?: () => void;
}

export function SignaturePad({ contractId, contractTitle, portalToken, onSigned }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    if (!pos) return;
    setDrawing(true);
    lastPoint.current = pos;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
    ctx.fill();
    setHasStrokes(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !lastPoint.current) return;
    const pos = getPos(e, canvas);
    if (!pos) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  }

  function stopDraw() {
    setDrawing(false);
    lastPoint.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function canvasToSvg(): string {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const dataUrl = canvas.toDataURL("image/png");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
  }

  async function handleSign() {
    if (!signerName.trim()) { toast.error("Veuillez saisir votre nom."); return; }
    if (!hasStrokes) { toast.error("Veuillez apposer votre signature."); return; }
    setSaving(true);
    const svgData = canvasToSvg();
    const result = await saveSignatureAction({
      contractId,
      portalToken,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim() || undefined,
      svgData,
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    setSigned(true);
    toast.success("Contrat signé avec succès.");
    onSigned?.();
  }

  if (signed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-emerald-800">Contrat signé</p>
        <p className="text-xs text-emerald-600 mt-1">
          Signé par {signerName} — {new Date().toLocaleDateString("fr-FR")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
          <PenLine className="h-3.5 w-3.5" /> Signature électronique
        </p>
        <p className="text-xs text-amber-700">
          Vous êtes sur le point de signer : <strong>{contractTitle}</strong>
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Cette signature a valeur d'engagement. Date et heure seront horodatées.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sig-name">Nom complet *</Label>
          <Input id="sig-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Prénom NOM" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sig-email">Email (optionnel)</Label>
          <Input id="sig-email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="votre@email.com" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Signature *</Label>
          <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Effacer
          </button>
        </div>
        <div
          className={cn(
            "border-2 rounded-xl overflow-hidden bg-white touch-none",
            drawing ? "border-primary" : "border-slate-200",
            hasStrokes ? "" : "border-dashed"
          )}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-[150px] cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        {!hasStrokes && (
          <p className="text-xs text-center text-slate-400">Signez ici avec votre souris ou votre doigt</p>
        )}
      </div>

      <Button onClick={handleSign} disabled={saving || !hasStrokes || !signerName.trim()} className="w-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Signer le contrat
      </Button>
    </div>
  );
}
