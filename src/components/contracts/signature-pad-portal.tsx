"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PenLine, ChevronDown } from "lucide-react";
import { SignaturePad } from "./signature-pad";

interface SignaturePadPortalProps {
  contractId: string;
  contractTitle: string;
  portalToken: string;
}

export function SignaturePadPortal({ contractId, contractTitle, portalToken }: SignaturePadPortalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
        onClick={() => setOpen(true)}
      >
        <PenLine className="h-3.5 w-3.5" />
        Signer ce contrat
        <ChevronDown className="h-3.5 w-3.5 ml-auto" />
      </Button>
    );
  }

  return (
    <SignaturePad
      contractId={contractId}
      contractTitle={contractTitle}
      portalToken={portalToken}
      onSigned={() => router.refresh()}
    />
  );
}
