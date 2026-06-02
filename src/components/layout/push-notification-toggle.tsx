"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePushSubscriptionAction, deletePushSubscriptionAction } from "@/lib/actions/push-notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationToggle() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      Promise.resolve().then(() => setStatus("unsupported"));
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) setStatus("subscribed");
      else if (Notification.permission === "denied") setStatus("denied");
      else setStatus("unsubscribed");
    });
  }, []);

  async function handleToggle() {
    if (status === "subscribed") {
      setToggling(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await deletePushSubscriptionAction(sub.endpoint);
      }
      setStatus("unsubscribed");
      setToggling(false);
      toast.success("Notifications désactivées.");
      return;
    }

    if (status === "denied") {
      toast.error("Notifications bloquées par le navigateur. Modifiez les permissions du site.");
      return;
    }

    setToggling(true);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      setToggling(false);
      toast.error("Permission refusée.");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("Clé VAPID non configurée. Ajoutez NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
      setToggling(false);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        p256dh: (json.keys?.p256dh) ?? "",
        auth: (json.keys?.auth) ?? "",
      });
      setStatus("subscribed");
      toast.success("Notifications activées !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'abonnement.");
    }
    setToggling(false);
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium text-[#ADAB9D] hover:bg-[#F7F8FA] hover:text-[#475569] transition-colors duration-100 w-full"
      title={status === "subscribed" ? "Désactiver les notifications" : "Activer les notifications"}
    >
      {toggling ? (
        <Loader2 className="h-[15px] w-[15px] animate-spin shrink-0" />
      ) : status === "subscribed" ? (
        <Bell className="h-[15px] w-[15px] shrink-0 text-[#505050]" />
      ) : (
        <BellOff className="h-[15px] w-[15px] shrink-0 opacity-55" />
      )}
      <span className="leading-none">{status === "subscribed" ? "Notifs activées" : "Activer les notifs"}</span>
    </button>
  );
}
