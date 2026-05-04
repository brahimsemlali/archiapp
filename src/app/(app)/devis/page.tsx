import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { formatDate, formatMAD } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  brouillon: "secondary",
  envoye: "outline",
  accepte: "default",
  refuse: "destructive",
  expire: "outline",
};

export default async function DevisPage() {
  const supabase = await createClient();

  const { data: devisList } = await supabase
    .from("devis")
    .select("id, number, title, status, total_centimes, created_at, clients(name), projects(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vos propositions commerciales</p>
        </div>
        <Link href="/devis/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau devis
          </Button>
        </Link>
      </div>

      {devisList && devisList.length > 0 ? (
        <div className="space-y-2">
          {devisList.map((d) => {
            const client = (d.clients as unknown) as { name: string } | null;
            const project = (d.projects as unknown) as { title: string } | null;
            return (
              <Link key={d.id} href={`/devis/${d.id}`}>
                <div className="bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{d.number}</span>
                        <p className="text-sm font-medium truncate">{d.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client?.name ?? "—"}
                        {project ? ` · ${project.title}` : ""}
                        {" · "}{formatDate(d.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{formatMAD(d.total_centimes)}</span>
                    <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucun devis pour l'instant</p>
          <p className="text-xs mt-1 mb-4">Créez votre premier devis en quelques minutes</p>
          <Link href="/devis/new">
            <Button variant="outline" size="sm">Créer un devis</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
