"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
      <AlertTriangle className="h-12 w-12 text-destructive opacity-60" />
      <div>
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error.message || "Une erreur inattendue s'est produite. Veuillez réessayer."}
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
