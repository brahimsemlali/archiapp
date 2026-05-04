"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { createShareLinkAction } from "@/lib/actions/files";

interface FileRow {
  id: string;
  filename: string;
}

interface ShareLinkDialogProps {
  file: FileRow;
  onClose: () => void;
}

export function ShareLinkDialog({ file, onClose }: ShareLinkDialogProps) {
  const [expiry, setExpiry] = useState("7");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const expiryDays = expiry === "never" ? null : parseInt(expiry, 10);
    const result = await createShareLinkAction(file.id, expiryDays);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setGeneratedLink(result.data);
    toast.success("Lien de partage généré.");
  }

  async function handleCopy() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Lien copié !");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Partager le fichier
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground truncate">{file.filename}</p>

        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expiration du lien</Label>
              <Select value={expiry} onValueChange={(v) => { if (v) setExpiry(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jour</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="never">Sans expiration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer le lien
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>Lien de partage</Label>
            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce lien permet de télécharger le fichier sans connexion.
              {expiry !== "never" && ` Expire dans ${expiry} jour(s).`}
            </p>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
