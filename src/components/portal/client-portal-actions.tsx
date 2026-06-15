"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCircle2, Copy, ExternalLink, Link, Loader2, PenLine, Send, Trash2, Unlink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createClientPortalLinkAction,
  revokeClientPortalLinkAction,
  respondClientPortalDevisAction,
  createClientPortalMessageAction,
  replyToClientPortalAction,
  respondClientPortalFileApprovalAction,
  updateClientPortalVisibilityAction,
  addClientPortalUpdateAction,
  deleteClientPortalUpdateAction,
} from "@/lib/actions/portal";
import { signMeetingPvAction } from "@/lib/actions/meeting-intelligence";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";
import { useLocalization } from "@/components/localization-provider";
import {
  PORTAL_SECTIONS,
  PORTAL_GROUPS,
  type PortalSectionKey,
  type PortalUpdate,
} from "@/lib/portal-sections";

export function ClientPortalShare({
  clientId,
  existingUrl,
  lastAccessedAt,
  accessCount,
}: {
  clientId: string;
  existingUrl: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
}) {
  const { formatRelative } = useLocalization();
  const router = useRouter();
  const [url, setUrl] = useState(existingUrl);
  const [creating, startCreate] = useTransition();
  const [revoking, startRevoke] = useTransition();

  function create() {
    startCreate(async () => {
      const result = await createClientPortalLinkAction(clientId);
      if (!result.ok) { toast.error(result.error); return; }
      setUrl(result.data.url);
      toast.success("Portail client créé.");
      router.refresh(); // reveal the sharing panel + discussion (server-rendered on clientPortalLink)
    });
  }

  function revoke() {
    startRevoke(async () => {
      const result = await revokeClientPortalLinkAction(clientId);
      if (!result.ok) { toast.error(result.error); return; }
      setUrl(null);
      toast.success("Accès client révoqué.");
      router.refresh();
    });
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => toast.success("Lien copié."));
  }

  if (!url) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Créez un espace client sécurisé pour partager contrats, devis, factures, visites chantier et l'historique complet de votre relation. Le client accède sans compte.
        </p>
        <Button onClick={create} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
          Créer le portail client
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-sm font-medium text-emerald-800">Portail actif</p>
          {accessCount > 0 && (
            <span className="ml-auto text-xs text-emerald-600">
              {accessCount} consultation{accessCount > 1 ? "s" : ""}
              {lastAccessedAt ? ` · dernière visite ${formatRelative(lastAccessedAt)}` : ""}
            </span>
          )}
        </div>
        <p className="text-xs text-emerald-700 font-mono break-all">{url}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            Copier le lien
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir
            </Button>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={create} disabled={creating} className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link className="h-3.5 w-3.5" />}
          Régénérer le lien
        </Button>
        <Button size="sm" variant="outline" onClick={revoke} disabled={revoking} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
          {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
          Révoquer l'accès
        </Button>
      </div>
    </div>
  );
}

type PortalMessage = { id: string; sender: string; sender_name: string | null; body: string; created_at: string };

export function ArchitectReplyForm({
  clientId,
  messages,
  firmName,
}: {
  clientId: string;
  messages: PortalMessage[];
  firmName: string | null;
}) {
  const { formatDate } = useLocalization();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await replyToClientPortalAction(clientId, body);
      if (!result.ok) { toast.error(result.error); return; }
      setBody("");
      toast.success("Réponse envoyée.");
    });
  }

  return (
    <div className="space-y-3">
      {messages.length > 0 ? (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div key={msg.id} className={`rounded-lg px-3 py-2 text-sm ${msg.sender === "client" ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100 ml-4"}`}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-600">
                  {msg.sender === "client" ? (msg.sender_name ?? "Client") : (firmName ?? "Cabinet")}
                </span>
                <span className="text-[11px] text-gray-400">{formatDate(msg.created_at)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun message client pour l'instant.</p>
      )}
      <div className="border-t pt-3 space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Répondre au client..." rows={2} className="text-sm" />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
            {pending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClientPortalDevisResponse({
  token,
  devisId,
}: {
  token: string;
  devisId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"accepte" | "refuse" | null>(null);

  function respond(status: "accepte" | "refuse") {
    setIntent(status);
    startTransition(async () => {
      const result = await respondClientPortalDevisAction(token, devisId, status);
      setIntent(null);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(status === "accepte" ? "Devis accepté." : "Devis refusé.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={pending} onClick={() => respond("accepte")}>
        {intent === "accepte" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
        Accepter
      </Button>
      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={pending} onClick={() => respond("refuse")}>
        {intent === "refuse" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1.5" />}
        Refuser
      </Button>
    </div>
  );
}

const SENDER_NAME_KEY = "archidesk_portal_sender_name";

export function ClientPortalMessageForm({ token }: { token: string }) {
  const router = useRouter();
  const [senderName, setSenderName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SENDER_NAME_KEY) ?? "";
  });
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setSenderName(value);
    if (typeof window !== "undefined") localStorage.setItem(SENDER_NAME_KEY, value);
  }

  function submit() {
    startTransition(async () => {
      const result = await createClientPortalMessageAction(token, { senderName, body });
      if (!result.ok) { toast.error(result.error); return; }
      setBody("");
      toast.success("Message envoyé.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Input value={senderName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Votre nom" className="text-sm" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écrire un message..." rows={3} className="text-sm" />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
          Envoyer
        </Button>
      </div>
    </div>
  );
}

export function ClientPortalFileApproval({ token, fileId }: { token: string; fileId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"approved" | "rejected" | null>(null);

  function submit(status: "approved" | "rejected") {
    setIntent(status);
    startTransition(async () => {
      const result = await respondClientPortalFileApprovalAction(token, fileId, status, note);
      setIntent(null);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(status === "approved" ? "Document approuvé." : "Correction demandée.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800 mb-2">Votre approbation est demandée</p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Commentaire optionnel..."
        className="bg-white text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => submit("approved")} disabled={pending} className="bg-[#2F8F5C] hover:bg-[#26764B]">
          {intent === "approved" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Approuver
        </Button>
        <Button size="sm" variant="outline" onClick={() => submit("rejected")} disabled={pending}>
          {intent === "rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Demander correction
        </Button>
      </div>
    </div>
  );
}

export function PortalMeetingPvSign({
  meetingId,
  meetingTitle,
  portalToken,
}: {
  meetingId: string;
  meetingTitle: string;
  portalToken: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [open]);

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

  function stopDraw() { setDrawing(false); lastPoint.current = null; }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function canvasToSvg(): string {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const dataUrl = canvas.toDataURL("image/png");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
  }

  async function handleSign() {
    if (!signerName.trim()) { toast.error("Saisissez votre nom."); return; }
    if (!hasStrokes) { toast.error("Apposez votre signature."); return; }
    setSaving(true);
    const result = await signMeetingPvAction({ meetingId, portalToken, signerName: signerName.trim(), svgData: canvasToSvg() });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    setSigned(true);
    toast.success("PV signé avec succès.");
    router.refresh();
  }

  if (signed) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
        <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-1.5" />
        <p className="text-sm font-semibold text-emerald-800">PV signé — merci {signerName}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <PenLine className="h-3.5 w-3.5" />
        Signer le PV de réunion
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <PenLine className="h-4 w-4 text-amber-600" />
          Signer le PV : {meetingTitle}
        </p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Votre nom *</label>
        <input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Prénom NOM"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Signature *</label>
          <button onClick={clearCanvas} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <Trash2 className="h-3 w-3" />Effacer
          </button>
        </div>
        <div className={cn("border-2 rounded-xl overflow-hidden bg-white touch-none", drawing ? "border-primary" : "border-gray-200", !hasStrokes && "border-dashed")}>
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="w-full h-[110px] cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        {!hasStrokes && <p className="text-xs text-center text-gray-400 mt-1">Signez ici avec votre doigt ou votre souris</p>}
      </div>
      <button
        onClick={handleSign}
        disabled={saving || !hasStrokes || !signerName.trim()}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {saving ? "Signature en cours..." : "Confirmer la signature"}
      </button>
    </div>
  );
}

function PortalToggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-primary" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function ClientPortalSharing({
  clientId,
  initialVisibility,
  initialUpdates,
}: {
  clientId: string;
  initialVisibility: Record<PortalSectionKey, boolean>;
  initialUpdates: PortalUpdate[];
}) {
  const { formatDate } = useLocalization();
  const [visibility, setVisibility] = useState(initialVisibility);
  // Ref mirrors latest visibility so rapid toggles always save the FULL intended
  // map — never a stale delta that could silently re-expose a section.
  const visibilityRef = useRef(visibility);
  const [updates, setUpdates] = useState<PortalUpdate[]>(initialUpdates);
  const [savingKey, setSavingKey] = useState<PortalSectionKey | null>(null);
  const [body, setBody] = useState("");
  const [posting, startPost] = useTransition();

  function toggle(key: PortalSectionKey) {
    const next = { ...visibilityRef.current, [key]: !visibilityRef.current[key] };
    visibilityRef.current = next;
    setVisibility(next);
    setSavingKey(key);
    // Send the complete map so concurrent saves resolve to full UI intent.
    updateClientPortalVisibilityAction(clientId, next).then((result) => {
      setSavingKey(null);
      if (!result.ok) {
        const reverted = { ...visibilityRef.current, [key]: !next[key] };
        visibilityRef.current = reverted;
        setVisibility(reverted);
        toast.error(result.error);
      }
    });
  }

  function postUpdate() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startPost(async () => {
      const result = await addClientPortalUpdateAction(clientId, trimmed);
      if (!result.ok) { toast.error(result.error); return; }
      setUpdates((u) => [result.data, ...u]);
      setBody("");
      toast.success("Mise à jour publiée.");
    });
  }

  function removeUpdate(id: string) {
    const prev = updates;
    setUpdates((u) => u.filter((x) => x.id !== id));
    deleteClientPortalUpdateAction(clientId, id).then((result) => {
      if (!result.ok) { setUpdates(prev); toast.error(result.error); }
    });
  }

  return (
    <div className="space-y-5 rounded-xl border border-gray-100 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Ce que le client voit</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Activez ou masquez chaque section de l&apos;espace client. Les modifications sont immédiates.
        </p>
      </div>

      {PORTAL_GROUPS.map((group) => {
        const sections = PORTAL_SECTIONS.filter((s) => s.group === group.id);
        return (
          <div key={group.id} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
            <div className="divide-y divide-gray-50 rounded-lg border border-gray-100">
              {sections.map((section) => (
                <div key={section.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <PortalToggle
                    on={visibility[section.key]}
                    onClick={() => toggle(section.key)}
                    disabled={savingKey === section.key}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">Notes & mises à jour</p>
          {!visibility.notes && (
            <span className="text-[11px] text-amber-600">Masqué — activez « Notes &amp; mises à jour » ci-dessus</span>
          )}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ex : Permis de construire déposé, réponse attendue sous 6 semaines."
          rows={2}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={postUpdate} disabled={posting || !body.trim()}>
            {posting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Publier
          </Button>
        </div>
        {updates.length > 0 && (
          <div className="space-y-2 pt-1">
            {updates.map((u) => (
              <div key={u.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-gray-700 whitespace-pre-wrap">{u.body}</p>
                  <button
                    onClick={() => removeUpdate(u.id)}
                    className="shrink-0 text-gray-300 hover:text-red-500"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {formatDate(u.createdAt)}{u.authorName ? ` · ${u.authorName}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
