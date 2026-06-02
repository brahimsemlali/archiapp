"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Impossible de mettre à jour le mot de passe. Ouvrez le lien reçu par email à nouveau.");
      return;
    }

    toast.success("Mot de passe mis à jour.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] bg-[#0B1220] mb-4">
            <span className="font-fraunces text-[#F7F8FA] text-[20px] font-semibold leading-none">A</span>
          </div>
          <h1 className="font-fraunces text-[22px] font-semibold tracking-tight text-[#0B1220] leading-none">
            Nouveau mot de passe
          </h1>
          <p className="text-[12.5px] text-[#64748B] mt-2">
            Choisissez un mot de passe sécurisé pour votre compte ArchiDesk.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_16px_0_rgba(22,23,14,0.06)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-semibold text-[#475569] uppercase tracking-[0.06em]">
                Nouveau mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-9 text-[13.5px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[11px] font-semibold text-[#475569] uppercase tracking-[0.06em]">
                Confirmer
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-9 text-[13.5px]"
              />
            </div>
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer le mot de passe
            </Button>
            <p className="text-center text-[12px] text-[#ADAB9D]">
              <Link href="/login" className="font-semibold text-[#0B1220] hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
