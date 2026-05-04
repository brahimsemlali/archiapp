import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, FileText, Clock } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { count: projectsCount },
    { count: clientsCount },
    { count: contractsCount },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("clients").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "brouillon"),
  ]);

  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("today")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bonjour, {user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projets actifs
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{projectsCount ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{clientsCount ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contracts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contrats en brouillon
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{contractsCount ?? 0}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {t("recentActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="text-muted-foreground">{log.action}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(log.created_at).toLocaleDateString("fr-MA")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
