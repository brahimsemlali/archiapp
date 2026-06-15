"use client";

import { useState } from "react";
import { useLocalization } from "@/components/localization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, Check, Trash2, Shield, Eye, Wrench, Crown } from "lucide-react";
import {
  inviteMemberAction,
  revokeInviteAction,
  removeMemberAction,
  updateMemberRoleAction,
  type WorkspaceMember,
  type WorkspaceInvite,
  type WorkspaceMemberRole,
} from "@/lib/actions/workspace";

const ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
};

const ROLE_ICONS: Record<WorkspaceMemberRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Wrench,
  viewer: Eye,
};

const ROLE_COLORS: Record<WorkspaceMemberRole, string> = {
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  member: "bg-blue-100 text-blue-700 border-blue-200",
  viewer: "bg-slate-100 text-slate-600 border-slate-200",
};

interface TeamMembersProps {
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  appUrl: string;
  currentUserRole: WorkspaceMemberRole;
}

export function TeamMembers({ members: initialMembers, invites: initialInvites, appUrl, currentUserRole }: TeamMembersProps) {
  const { formatDateShort } = useLocalization();
  const [memberSnapshot, setMemberSnapshot] = useState({
    source: initialMembers,
    members: initialMembers,
  });
  const [inviteSnapshot, setInviteSnapshot] = useState({
    source: initialInvites,
    invites: initialInvites,
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMemberRole>("member");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const canManageTeam = currentUserRole === "owner" || currentUserRole === "admin";

  if (memberSnapshot.source !== initialMembers) {
    setMemberSnapshot({ source: initialMembers, members: initialMembers });
  }
  if (inviteSnapshot.source !== initialInvites) {
    setInviteSnapshot({ source: initialInvites, invites: initialInvites });
  }

  const members = memberSnapshot.members;
  const invites = inviteSnapshot.invites;
  const setMembers = (update: WorkspaceMember[] | ((currentMembers: WorkspaceMember[]) => WorkspaceMember[])) => {
    setMemberSnapshot((current) => ({
      source: current.source,
      members: typeof update === "function" ? update(current.members) : update,
    }));
  };
  const setInvites = (update: WorkspaceInvite[] | ((currentInvites: WorkspaceInvite[]) => WorkspaceInvite[])) => {
    setInviteSnapshot((current) => ({
      source: current.source,
      invites: typeof update === "function" ? update(current.invites) : update,
    }));
  };

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    const result = await inviteMemberAction(email.trim(), role);
    setInviting(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Invitation créée.");
    setEmail("");
    setInvites((prev) => [result.data.invite, ...prev]);
    copyToClipboard(result.data.inviteUrl, result.data.invite.token);
  }

  function copyToClipboard(inviteUrl: string, token: string) {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedToken(token);
      toast.success("Lien copié dans le presse-papiers.");
      setTimeout(() => setCopiedToken(null), 3000);
    });
  }

  async function handleRevoke(inviteId: string) {
    const result = await revokeInviteAction(inviteId);
    if (!result.ok) { toast.error(result.error); return; }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    toast.success("Invitation révoquée.");
  }

  async function handleRemoveMember(memberId: string) {
    const result = await removeMemberAction(memberId);
    if (!result.ok) { toast.error(result.error); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Membre retiré.");
  }

  async function handleRoleChange(memberId: string, newRole: WorkspaceMemberRole) {
    const result = await updateMemberRoleAction(memberId, newRole);
    if (!result.ok) { toast.error(result.error); return; }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    toast.success("Rôle mis à jour.");
  }

  return (
    <div className="space-y-6">
      {/* Members list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Membres actuels</h3>
        <div className="space-y-2">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role];
            const isOwner = member.role === "owner";
            return (
              <div key={member.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {member.user.fullName ? member.user.fullName[0]?.toUpperCase() : member.user.email[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {member.user.fullName ?? member.user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{member.user.email}</p>
                </div>
                {isOwner || !canManageTeam ? (
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[member.role]} shrink-0`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {ROLE_LABELS[member.role]}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v as WorkspaceMemberRole)}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="viewer">Lecteur</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Invitations en attente</h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{invite.email}</p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[invite.role]} · expire le {formatDateShort(invite.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500"
                    title="Copier le lien"
                    onClick={() => copyToClipboard(`${appUrl}/invite/${invite.token}`, invite.token)}
                  >
                    {copiedToken === invite.token ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {canManageTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRevoke(invite.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManageTeam ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Inviter un collaborateur</h3>
          <form onSubmit={handleInvite} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="collaborateur@cabinet.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as WorkspaceMemberRole)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="viewer">Lecteur</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviting} className="shrink-0">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Inviter</span>
            </Button>
          </form>
          <p className="text-xs text-slate-400 mt-2">
            Un lien d&apos;invitation sera généré. Partagez-le avec votre collaborateur.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Vous pouvez consulter l'équipe, mais seuls les administrateurs peuvent modifier les rôles ou inviter des membres.
        </p>
      )}
    </div>
  );
}
