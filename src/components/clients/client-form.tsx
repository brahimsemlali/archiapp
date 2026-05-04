"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormValues } from "@/lib/validators/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  loading?: boolean;
}

export function ClientForm({ defaultValues, onSubmit, loading }: ClientFormProps) {
  const t = useTranslations("clients");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { type: "particulier", ...defaultValues },
  });

  const clientType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")} *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("type")} *</Label>
          <Select
            value={clientType}
            onValueChange={(v) => setValue("type", v as "particulier" | "societe")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">{t("particulier")}</SelectItem>
              <SelectItem value="societe">{t("societe")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} type="tel" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" {...register("email")} type="email" />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {clientType === "societe" && (
          <div className="space-y-2">
            <Label htmlFor="ice">{t("ice")}</Label>
            <Input id="ice" {...register("ice")} />
          </div>
        )}

        {clientType === "particulier" && (
          <div className="space-y-2">
            <Label htmlFor="cin">{t("cin")}</Label>
            <Input id="cin" {...register("cin")} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("address")}</Label>
        <Input id="address" {...register("address")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" {...register("notes")} rows={3} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
