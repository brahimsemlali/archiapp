"use client";

import { useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, Building2 } from "lucide-react";
import { toast } from "sonner";
import { updateFirmProfileAction, type FirmProfileValues } from "@/lib/actions/settings";
import { uploadLogoAction } from "@/lib/actions/logo";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageFile } from "@/lib/upload-rules";
import { useTranslations, useLocale } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_PACKS, SUPPORTED_CURRENCIES, getCountryPack, resolveLocalization, type AppLocale } from "@/lib/country-packs";

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
    country?: string | null;
    currency?: string | null;
    default_tax_rate?: number | string | null;
  } | null;
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("settingsForm");
  const locale = useLocale() as AppLocale;
  const localization = resolveLocalization(profile);

  const { register, handleSubmit, control, setValue } = useForm<FirmProfileValues>({
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
      country: localization.country,
      currency: localization.currency,
      defaultTaxRate: localization.defaultTaxRate,
    },
  });
  const country = useWatch({ control, name: "country" });
  const currency = useWatch({ control, name: "currency" });

  function handleCountryChange(code: string | null) {
    if (!code) return;
    const pack = getCountryPack(code);
    setValue("country", code, { shouldDirty: true });
    setValue("currency", pack.currency, { shouldDirty: true });
    setValue("defaultTaxRate", pack.defaultTaxRate, { shouldDirty: true });
  }

  async function onSubmit(values: FirmProfileValues) {
    setLoading(true);
    const result = await updateFirmProfileAction(values);
    setLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(t("saved"));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) { toast.error(t("logoError")); input.value = ""; return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(t("logoSizeError")); input.value = ""; return; }
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", file);
    const result = await uploadLogoAction(fd);
    setUploadingLogo(false);
    input.value = "";
    if (!result.ok) { toast.error(result.error); return; }
    setLogoUrl(result.data);
    toast.success(t("logoUpdated"));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Logo */}
      <div>
        <h3 className="text-sm font-medium mb-3">{t("logoSection")}</h3>
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
              {logoUrl ? t("changeLogo") : t("uploadLogo")}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">{t("logoHint")}</p>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">{t("identitySection")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firmName">{t("firmName")}</Label>
            <Input id="firmName" {...register("firmName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="architectName">{t("architectName")}</Label>
            <Input id="architectName" {...register("architectName")} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">{t("address")}</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" {...register("phone")} type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" {...register("email")} type="email" />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">{t("localizationSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("country")}</Label>
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(COUNTRY_PACKS).map((pack) => (
                  <SelectItem key={pack.code} value={pack.code}>
                    {pack.labels[locale] ?? pack.labels.fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("currency")}</Label>
            <Select value={currency} onValueChange={(v) => v && setValue("currency", v, { shouldDirty: true })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultTaxRate">{t("defaultTaxRate")}</Label>
            <Input
              id="defaultTaxRate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register("defaultTaxRate", { valueAsNumber: true })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{t("localizationHint")}</p>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-3">{t("legalSection")}</h3>
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
        {t("save")}
      </Button>
    </form>
  );
}
