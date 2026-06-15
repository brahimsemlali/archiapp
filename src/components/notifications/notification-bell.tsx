"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useLocale } from "next-intl";
import { SmartNotificationsPanel, type SmartAlert } from "@/components/notifications/smart-notifications-panel";
import { getNotificationAlertsAction } from "@/lib/actions/notifications";

export function NotificationBell() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadAlerts = () => {
    getNotificationAlertsAction().then((result) => {
      if (result.ok) setAlerts(result.data);
      setLoaded(true);
    });
  };

  useEffect(() => {
    loadAlerts();
    window.addEventListener("focus", loadAlerts);
    return () => window.removeEventListener("focus", loadAlerts);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const count = alerts.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) loadAlerts();
        }}
        aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white/75 text-[#475569] shadow-[0_8px_22px_rgba(22,23,14,0.045)] transition-all hover:bg-[#F7F8FA] hover:shadow-md"
      >
        <Bell className="h-4 w-4" />
        {loaded && count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl shadow-xl md:absolute md:inset-auto md:end-0 md:top-11 md:w-96">
          <SmartNotificationsPanel alerts={alerts} loading={!loaded} locale={locale} />
        </div>
      )}
    </div>
  );
}
