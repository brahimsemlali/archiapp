"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { acceptInviteAction } from "@/lib/actions/workspace";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
  userEmail: string;
}

export function AcceptInviteButton({ token, userEmail }: Props) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    setAccepting(true);
    const result = await acceptInviteAction(token);
    setAccepting(false);
    if (!result.ok) { toast.error(result.error); return; }
    setAccepted(true);
    toast.success("Invitation acceptée ! Bienvenue dans l'équipe.");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (accepted) {
    return (
      <div className="flex items-center gap-2 justify-center py-3 text-emerald-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-semibold">Invitation acceptée — redirection...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Connecté en tant que <span className="font-medium">{userEmail}</span>.
      </p>
      <Button onClick={handleAccept} disabled={accepting} className="w-full">
        {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Accepter l&apos;invitation
      </Button>
    </div>
  );
}
