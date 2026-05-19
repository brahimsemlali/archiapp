"use client";

import { useState } from "react";
import { UpgradeModal } from "./upgrade-modal";

export function useUpgradeModal() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);

  function trigger(message?: string) {
    setReason(message);
    setOpen(true);
  }

  const modal = <UpgradeModal open={open} onOpenChange={setOpen} reason={reason} />;

  return { trigger, modal };
}
