"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const t = useTranslations("auth");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(t("loginError"));
      setLoading(false);
      return;
    }

    const invite = searchParams.get("invite");
    router.push(invite ? `/invite/${invite}` : "/onboarding");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const invite = searchParams.get("invite");
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (invite) callbackUrl.searchParams.set("invite", invite);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.href },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-4">
      <div className="w-full max-w-[360px]">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] bg-[#0B1220] mb-4">
            <span className="font-fraunces text-[#F7F8FA] text-[20px] font-semibold leading-none">A</span>
          </div>
          <h1 className="font-fraunces text-[22px] font-semibold tracking-tight text-[#0B1220] leading-none">ArchiDesk</h1>
          <p className="text-[12.5px] text-[#ADAB9D] mt-1.5">{t("login")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_16px_0_rgba(22,23,14,0.06)] p-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-semibold text-[#475569] uppercase tracking-[0.06em]">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-[13.5px] border-[#E5E7EB] focus-visible:ring-[#0B1220]/20 focus-visible:border-[#ADAB9D]"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-[11px] font-semibold text-[#475569] uppercase tracking-[0.06em]">{t("password")}</Label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-[#0B1220] hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9 text-[13.5px] border-[#E5E7EB] focus-visible:ring-[#0B1220]/20 focus-visible:border-[#ADAB9D]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#0B1220] hover:bg-[#2A2B1F] text-[#F7F8FA] h-9 text-[13.5px] font-semibold rounded-lg shadow-none mt-1"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login")}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#F0EEE8]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] text-[#C5C3B8]">ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full text-[13px] h-9 border-[#E5E7EB] text-[#1E293B] hover:bg-[#F7F8FA] rounded-lg"
            onClick={handleGoogleLogin}
          >
            {t("loginWithGoogle")}
          </Button>

          <p className="text-center text-[12px] text-[#ADAB9D]">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-[#0B1220] hover:underline font-semibold">
              {t("signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
