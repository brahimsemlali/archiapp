import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDate, formatMAD } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  brouillon:  { label: "Brouillon",  variant: "secondary",    icon: Clock },
  envoyee:    { label: "Envoyée",    variant: "outline",      icon: Clock },
  payee:      { label: "Payée",      variant: "default",      icon: CheckCircle2 },
  annulee:    { label: "Annulée",    variant: "destructive",  icon: AlertCircle },
};

export default async function FacturesPage() {
  const supabase = await createClient();

  const { data: factures } = await supabase
    .from("factures")
    .select("id, number, title, status, total_centimes, due_date, paid_at, created_at, clients(name), projects(title)")
    .order("created_at", { ascending: false });

  const totalUnpaid = (factures ?? [])
    .filter((f) => f.status === "envoyee")
    .reduce((sum, f) => sum + f.total_centimes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalUnpaid > 0 ? (
              <span className="text-amber-600 font-medium">{formatMAD(totalUnpaid)} en attente de paiement</span>
            ) : (
              "Vos factures et encaissements"
            )}
          </p>
        </div>
        <Link href="/factures/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      {factures && factures.length > 0 ? (
        <div className="space-y-2">
          {factures.map((f) => {
            const client = (f.clients as unknown) as { name: string } | null;
            const project = (f.projects as unknown) as { title: string } | null;
            const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.brouillon!;
            const StatusIcon = cfg.icon;
            const isOverdue = f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date();
            return (
              <Link key={f.id} href={`/factures/${f.id}`}>
                <div className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow flex items-center justify-between gap-4 ${isOverdue ? "border-red-200 bg-red-50/30" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={`h-5 w-5 shrink-0 ${f.status === "payee" ? "text-green-500" : f.status === "annulee" ? "text-destructive" : isOverdue ? "text-red-500" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{f.number}</span>
                        <p className="text-sm font-medium truncate">{f.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client?.name ?? "—"}
                        {project ? ` · ${project.title}` : ""}
                        {f.due_date ? ` · Échéance ${formatDate(f.due_date)}` : ""}
                        {isOverdue && <span className="text-red-500 font-medium"> · En retard</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{formatMAD(f.total_centimes)}</span>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune facture pour l'instant</p>
          <p className="text-xs mt-1 mb-4">Créez une facture ou convertissez un devis accepté</p>
          <Link href="/factures/new">
            <Button variant="outline" size="sm">Créer une facture</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
