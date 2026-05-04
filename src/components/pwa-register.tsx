"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    // @ts-expect-error BeforeInstallPromptEvent not in TS lib
    await installPrompt.prompt();
    setInstallPrompt(null);
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white border rounded-xl shadow-lg p-4 flex items-center gap-3">
      <Download className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Installer ArchiDesk</p>
        <p className="text-xs text-muted-foreground">Accès rapide depuis votre écran d'accueil</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={handleInstall}>Installer</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowBanner(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
