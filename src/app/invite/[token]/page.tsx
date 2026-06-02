import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AcceptInviteButton } from "@/components/invite/accept-invite-button";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const serviceSupabase = await createServiceClient();

  // Fetch invite info server-side. Public token rows are not exposed through anonymous RLS.
  const { data: invite } = await serviceSupabase
    .from("workspace_invites")
    .select("id, email, role, status, expires_at, workspace_id")
    .eq("token", token)
    .single();

  const { data: { user } } = await supabase.auth.getUser();

  if (!invite) {
    return <InviteLayout status="not_found" />;
  }

  if (invite.status !== "pending") {
    return <InviteLayout status="used" />;
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <InviteLayout status="expired" />;
  }

  // Fetch workspace name for display
  const { data: workspace } = await serviceSupabase
    .from("workspaces")
    .select("name")
    .eq("id", invite.workspace_id)
    .single();

  const roleLabel: Record<string, string> = {
    owner: "Propriétaire",
    admin: "Administrateur",
    member: "Membre",
    viewer: "Lecteur",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">ArchiDesk</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation au cabinet</h1>
          <p className="text-sm text-slate-500 mb-6">
            Vous avez été invité à rejoindre{" "}
            <span className="font-semibold text-slate-800">{workspace?.name ?? "un cabinet"}</span>{" "}
            en tant que <span className="font-semibold text-slate-800">{roleLabel[invite.role] ?? invite.role}</span>.
          </p>

          {user ? (
            <AcceptInviteButton token={token} userEmail={user.email ?? ""} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Connectez-vous ou créez un compte pour accepter cette invitation.
              </p>
              <Link
                href={`/login?invite=${token}`}
                className="block w-full text-center bg-primary text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href={`/signup?invite=${token}`}
                className="block w-full text-center bg-white text-slate-700 py-2.5 px-4 rounded-lg text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Créer un compte
              </Link>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4 text-center">
            Invitation envoyée à {invite.email} · expire le{" "}
            {new Date(invite.expires_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  );
}

function InviteLayout({ status }: { status: "not_found" | "used" | "expired" }) {
  const config = {
    not_found: {
      icon: XCircle,
      color: "text-red-500",
      title: "Invitation introuvable",
      message: "Ce lien d'invitation n'existe pas ou a été supprimé.",
    },
    used: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      title: "Invitation déjà utilisée",
      message: "Cette invitation a déjà été acceptée ou révoquée.",
    },
    expired: {
      icon: Clock,
      color: "text-amber-500",
      title: "Invitation expirée",
      message: "Ce lien d'invitation a expiré. Demandez un nouveau lien à l'administrateur du cabinet.",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="flex items-center gap-2.5 justify-center mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">ArchiDesk</span>
          </div>
          <Icon className={`h-12 w-12 mx-auto mb-4 ${config.color}`} />
          <h1 className="text-xl font-bold text-slate-900 mb-2">{config.title}</h1>
          <p className="text-sm text-slate-500">{config.message}</p>
          <Link href="/" className="inline-block mt-6 text-sm font-semibold text-primary hover:underline">
            Retour à l&apos;accueil →
          </Link>
        </div>
      </div>
    </div>
  );
}
