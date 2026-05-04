"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Trash2, Loader2, ExternalLink } from "lucide-react";
import { createProjectPortalLinkAction, revokeProjectPortalLinkAction } from "@/lib/actions/portal";
import { toast } from "sonner";

interface SharePortalButtonProps {
  projectId: string;
  existingToken?: string | null;
}

export function SharePortalButton({ projectId, existingToken }: SharePortalButtonProps) {
  const [token, setToken] = useState<string | null>(existingToken ?? null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalUrl = token ? `${appUrl}/portal/${token}` : null;

  async function handleGenerate() {
    setLoading(true);
    const result = await createProjectPortalLinkAction(projectId, 30);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setToken(result.data.token);
    await copyToClipboard(result.data.url);
    toast.success("Lien copié dans le presse-papiers !");
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  async function handleRevoke() {
    if (!confirm("Révoquer ce lien ? Le client ne pourra plus y accéder.")) return;
    setRevoking(true);
    await revokeProjectPortalLinkAction(projectId);
    setRevoking(false);
    setToken(null);
    toast.success("Lien révoqué.");
  }

  if (!token) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4 mr-2" />
        )}
        Partager avec le client
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-green-700 text-xs font-medium">Portail actif</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => portalUrl && copyToClipboard(portalUrl)}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 mr-2" />
        )}
        {copied ? "Copié !" : "Copier le lien"}
      </Button>
      {portalUrl && (
        <a href={portalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={handleRevoke}
        disabled={revoking}
      >
        {revoking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
