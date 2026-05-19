"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordResetAction(email);
    setLoading(false);
    setSent(true);
    toast.success("Si un compte existe, le lien a été envoyé.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] p-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] bg-[#16170E] mb-4">
            <span className="font-fraunces text-[#F7F7F4] text-[20px] font-semibold leading-none">A</span>
          </div>
          <h1 className="font-fraunces text-[22px] font-semibold tracking-tight text-[#16170E] leading-none">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-[12.5px] text-[#82806F] mt-2">
            Recevez un lien sécurisé pour choisir un nouveau mot de passe.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-[0_2px_16px_0_rgba(22,23,14,0.06)] p-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-[#2F8F5C]" />
              <div>
                <p className="text-sm font-semibold text-[#16170E]">Email envoyé</p>
                <p className="mt-1 text-xs text-[#82806F]">
                  Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E8E6DF] bg-white px-4 text-sm font-semibold text-[#16170E] transition-colors hover:bg-[#F7F7F4]"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold text-[#6B6B5A] uppercase tracking-[0.06em]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-9 text-[13.5px]"
                />
              </div>
              <Button type="submit" className="w-full h-9" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer le lien
              </Button>
              <p className="text-center text-[12px] text-[#ADAB9D]">
                <Link href="/login" className="font-semibold text-[#16170E] hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
