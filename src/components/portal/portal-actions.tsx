"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Send, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createPortalMessageAction,
  respondPortalFileApprovalAction,
  respondPortalDevisAction,
  createPortalDocumentUploadUrlAction,
  finalizePortalDocumentAction,
} from "@/lib/actions/portal";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DOCUMENT_UPLOAD_ACCEPT, isAllowedDocumentFile } from "@/lib/upload-rules";

export function PortalDevisResponse({
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
      const result = await respondPortalDevisAction(token, devisId, status);
      setIntent(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "accepte" ? "Devis accepté." : "Devis refusé.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={pending}
        onClick={() => respond("accepte")}
      >
        {intent === "accepte" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
        Accepter
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50"
        disabled={pending}
        onClick={() => respond("refuse")}
      >
        {intent === "refuse" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1.5" />}
        Refuser
      </Button>
    </div>
  );
}

export function PortalMessageForm({ token }: { token: string }) {
  const router = useRouter();
  const [senderName, setSenderName] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createPortalMessageAction(token, { senderName, body });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      toast.success("Message envoyé.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Input
        value={senderName}
        onChange={(event) => setSenderName(event.target.value)}
        placeholder="Votre nom"
        className="text-sm"
      />
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Écrire un message..."
        rows={3}
        className="text-sm"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
          Envoyer
        </Button>
      </div>
    </div>
  );
}

export function PortalDocumentUpload({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState(0);

  function submit(formData: FormData) {
    startTransition(async () => {
      const file = formData.get("file") as File | null;
      const note = (formData.get("note") as string | null) ?? "";
      if (!file) return;
      // Direct-to-storage signed upload (bypasses the Vercel server-action body cap)
      const ticket = await createPortalDocumentUploadUrlAction(token, { name: file.name, type: file.type, size: file.size });
      if (!ticket.ok) { toast.error(ticket.error); return; }
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(ticket.data.bucket)
        .uploadToSignedUrl(ticket.data.path, ticket.data.uploadToken, file, { contentType: ticket.data.contentType });
      if (uploadError) { toast.error(uploadError.message); return; }
      const result = await finalizePortalDocumentAction(token, {
        path: ticket.data.path,
        filename: file.name,
        sizeBytes: file.size,
        contentType: ticket.data.contentType,
        note,
      });
      if (!result.ok) { toast.error(result.error); return; }
      setKey((current) => current + 1);
      toast.success("Document envoyé.");
      router.refresh();
    });
  }

  function validateSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return;
    if (!isAllowedDocumentFile(file)) {
      event.preventDefault();
      toast.error("Type de fichier non autorisé.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      event.preventDefault();
      toast.error("Fichier trop lourd (max 25 Mo).");
    }
  }

  return (
    <form key={key} action={submit} onSubmit={validateSubmit} className="space-y-3">
      <Input
        name="file"
        type="file"
        required
        accept={DOCUMENT_UPLOAD_ACCEPT}
        className="text-sm"
      />
      <Textarea name="note" rows={2} placeholder="Note optionnelle..." className="text-sm" />
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          Envoyer un document
        </Button>
      </div>
    </form>
  );
}

export function PortalFileApproval({
  token,
  fileId,
}: {
  token: string;
  fileId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"approved" | "rejected" | null>(null);

  function submit(status: "approved" | "rejected") {
    setIntent(status);
    startTransition(async () => {
      const result = await respondPortalFileApprovalAction(token, fileId, status, note);
      setIntent(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "approved" ? "Document approuvé." : "Correction demandée.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">Votre approbation est demandée</p>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Commentaire optionnel..."
        className="mt-2 bg-white text-sm"
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
