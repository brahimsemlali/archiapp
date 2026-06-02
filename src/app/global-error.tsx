"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Catches errors in the root layout/render and reports them to Sentry.
// (Inert reporting until a DSN is configured; the fallback UI always shows.)
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, color: "#0B1220", background: "#F7F8FA" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Une erreur inattendue s’est produite.</h1>
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 20 }}>
            Nos équipes ont été notifiées. Vous pouvez réessayer.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "#2563EB", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
