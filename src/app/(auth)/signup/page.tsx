"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const t = useTranslations("auth");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error(t("acceptRequired"));
      return;
    }
    setLoading(true);

    const invite = searchParams.get("invite");
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (invite) callbackUrl.searchParams.set("invite", invite);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.href,
      },
    });

    if (error) {
      toast.error(t("signupError"));
      setLoading(false);
      return;
    }

    toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
    router.push(invite ? `/login?invite=${invite}` : "/login");
  }

  async function handleGoogleSignup() {
    if (!accepted) {
      toast.error(t("acceptRequired"));
      return;
    }
    const invite = searchParams.get("invite");
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (invite) callbackUrl.searchParams.set("invite", invite);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.href },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">ArchiDesk</CardTitle>
          <CardDescription>{t("signup")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                {t.rich("acceptTerms", {
                  terms: (chunks) => (
                    <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={loading || !accepted}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("signup")}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={!accepted}
          >
            {t("loginWithGoogle")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
