"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Building2, CheckCircle2, Loader2, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFirmProfileAction, type FirmProfileValues } from "@/lib/actions/settings";

interface OnboardingFormProps {
  defaultEmail?: string | null;
  defaultFirmName?: string | null;
  defaultArchitectName?: string | null;
}

export function OnboardingForm({
  defaultEmail,
  defaultFirmName,
  defaultArchitectName,
}: OnboardingFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FirmProfileValues>({
    defaultValues: {
      firmName: defaultFirmName ?? "",
      architectName: defaultArchitectName ?? "",
      email: defaultEmail ?? "",
      phone: "",
      address: "",
    },
  });

  async function onSubmit(values: FirmProfileValues) {
    if (!values.firmName?.trim()) {
      toast.error("Le nom du cabinet est requis.");
      return;
    }

    setSaving(true);
    const result = await updateFirmProfileAction(values);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Cabinet configuré.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="firmName">Nom du cabinet *</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              id="firmName"
              className="h-11 pl-9"
              placeholder="Atelier Benali Architecture"
              {...register("firmName", { required: true })}
            />
          </div>
          {errors.firmName && <p className="text-xs font-medium text-red-600">Le nom du cabinet est requis.</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="architectName">Architecte principal</Label>
          <Input
            id="architectName"
            className="h-11"
            placeholder="Nom complet"
            {...register("architectName")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            type="email"
            className="h-11"
            placeholder="contact@cabinet.ma"
            {...register("email")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              id="phone"
              type="tel"
              className="h-11 pl-9"
              placeholder="+212 6XX XXX XXX"
              {...register("phone")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Ville / adresse</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              id="address"
              className="h-11 pl-9"
              placeholder="Casablanca, Maroc"
              {...register("address")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2F8F5C]" />
          <div>
            <p className="text-sm font-semibold text-[#0B1220]">Après cette étape</p>
            <p className="mt-1 text-sm leading-6 text-[#475569]">
              Vous arriverez dans le tableau de bord pour créer votre premier client, projet et portail client.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" className="min-h-11 w-full" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrer dans ArchiDesk
      </Button>
    </form>
  );
}
