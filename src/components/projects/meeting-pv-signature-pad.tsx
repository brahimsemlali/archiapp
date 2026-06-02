"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PenLine, Trash2, CheckCircle2 } from "lucide-react";
import { signMeetingPvAction } from "@/lib/actions/meeting-intelligence";
import { cn } from "@/lib/utils";

interface MeetingPvSignaturePadProps {
  meetingId: string;
  meetingTitle: string;
  portalToken?: string;
  onSigned: (signerName: string) => void;
  onCancel?: () => void;
}

export function MeetingPvSignaturePad({
  meetingId,
  meetingTitle,
  portalToken = "",
  onSigned,
  onCancel,
}: MeetingPvSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState("");
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
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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
    if (!signerName.trim()) { toast.error("Veuillez saisir un nom."); return; }
    if (!hasStrokes) { toast.error("Veuillez apposer une signature."); return; }
    setSaving(true);
    const result = await signMeetingPvAction({
      meetingId,
      portalToken,
      signerName: signerName.trim(),
      svgData: canvasToSvg(),
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    setSigned(true);
    toast.success("PV signé.");
    onSigned(signerName.trim());
  }

  if (signed) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-800">PV de réunion signé</p>
        <p className="text-xs text-emerald-600 mt-1">Signé par {signerName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
          <PenLine className="h-3.5 w-3.5" />Signature du PV
        </p>
        <p className="text-xs text-amber-700">
          PV : <strong>{meetingTitle}</strong> — Cette signature vaut accusé de réception.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Nom du signataire *</Label>
        <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Prénom NOM" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Signature *</Label>
          <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <Trash2 className="h-3 w-3" />Effacer
          </button>
        </div>
        <div className={cn("border-2 rounded-xl overflow-hidden bg-white touch-none", drawing ? "border-primary" : "border-slate-200", !hasStrokes && "border-dashed")}>
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            className="w-full h-[120px] cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        {!hasStrokes && <p className="text-xs text-center text-slate-400">Signez ici avec votre souris ou votre doigt</p>}
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Annuler</Button>
        )}
        <Button className="flex-1" onClick={handleSign} disabled={saving || !hasStrokes || !signerName.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Signer le PV
        </Button>
      </div>
    </div>
  );
}
