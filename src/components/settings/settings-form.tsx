"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, Building2 } from "lucide-react";
import { toast } from "sonner";
import { updateFirmProfileAction, type FirmProfileValues } from "@/lib/actions/settings";
import { uploadLogoAction } from "@/lib/actions/logo";

interface SettingsFormProps {
  profile: {
    firm_name?: string | null;
    architect_name?: string | null;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    ice?: string | null;
    rc?: string | null;
    if_number?: string | null;
    cnss?: string | null;
    patente?: string | null;
    iban?: string | null;
  } | null;
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit } = useForm<FirmProfileValues>({
    defaultValues: {
      firmName: profile?.firm_name ?? "",
      architectName: profile?.architect_name ?? "",
      address: profile?.address ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? "",
      ice: profile?.ice ?? "",
      rc: profile?.rc ?? "",
      ifNumber: profile?.if_number ?? "",
      cnss: profile?.cnss ?? "",
      patente: profile?.patente ?? "",
      iban: profile?.iban ?? "",
    },
  });

  async function onSubmit(values: FirmProfileValues) {
    setLoading(true);
    const result = await updateFirmProfileAction(values);
    setLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Paramètres enregistrés.");
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", file);
    const result = await uploadLogoAction(fd);
    setUploadingLogo(false);
    if (!result.ok) { toast.error(result.error); return; }
    setLogoUrl(result.data);
    toast.success("Logo mis à jour.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Logo */}
      <div>
        <h3 className="text-sm font-medium mb-3">Logo du cabinet</h3>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground opacity-40" />
            )}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Upload className="mr-2 h-4 w-4" />}
              {logoUrl ? "Changer le logo" : "Téléverser un logo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — max 2 Mo</p>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">Identité du cabinet</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firmName">Nom du cabinet</Label>
            <Input id="firmName" {...register("firmName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="architectName">Nom de l'architecte</Label>
            <Input id="architectName" {...register("architectName")} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" {...register("phone")} type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register("email")} type="email" />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">Informations légales</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ice">ICE</Label>
            <Input id="ice" {...register("ice")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc">RC</Label>
            <Input id="rc" {...register("rc")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ifNumber">IF</Label>
            <Input id="ifNumber" {...register("ifNumber")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnss">CNSS</Label>
            <Input id="cnss" {...register("cnss")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patente">Patente</Label>
            <Input id="patente" {...register("patente")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" {...register("iban")} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}
