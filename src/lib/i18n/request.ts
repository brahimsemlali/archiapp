import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

type Locale = "fr" | "en" | "ar";
const SUPPORTED: Locale[] = ["fr", "en", "ar"];

const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import("../../messages/fr.json"),
  en: () => import("../../messages/en.json"),
  ar: () => import("../../messages/ar.json"),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value ?? "fr";
  const locale: Locale = SUPPORTED.includes(raw as Locale) ? (raw as Locale) : "fr";
  return {
    locale,
    messages: (await messageLoaders[locale]()).default,
  };
});
