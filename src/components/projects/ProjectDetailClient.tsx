"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Users, Link2, Copy, Check, Plus, Trash2, ArrowLeft,
  Clock, Shield, Eye, Crown, Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectMember, ProjectInvitation, ProjectMemberRole } from "@/types";

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  member: "Membre",
  viewer: "Lecteur",
};

const ROLE_ICONS: Record<ProjectMemberRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

const ROLE_COLORS: Record<ProjectMemberRole, string> = {
  owner: "text-violet-400 bg-violet-500/15 border-violet-500/30",
  admin: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  member: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  viewer: "text-muted-foreground bg-muted border-border",
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expirée";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `Expire dans ${days}j`;
  const hours = Math.floor(diff / 3600000);
  return `Expire dans ${hours}h`;
}

interface Props {
  project: Project;
  members: ProjectMember[];
  invitations: ProjectInvitation[];
  myRole: ProjectMemberRole;
  userId: string;
}

type Tab = "members" | "invitations";

export default function ProjectDetailClient({
  project,
  members: initialMembers,
  invitations: initialInvitations,
  myRole,
  userId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState(initialMembers);

  useEffect(() => {
    if (!initialMembers.length) return;
    const userIds = initialMembers.map((m) => m.user_id);
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, email")
      .in("id", userIds)
      .then(({ data }) => {
        if (!data?.length) return;
        const map = Object.fromEntries(data.map((p) => [p.id, p]));
        setMembers(initialMembers.map((m) => ({ ...m, profile: map[m.user_id] ?? m.profile })));
      });
  }, []);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "viewer" | "admin">("member");

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";

  const getJoinUrl = (token: string) =>
    `${window.location.origin}/join/${token}`;

  const copyLink = async (inv: ProjectInvitation) => {
    await navigator.clipboard.writeText(getJoinUrl(inv.token));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateInvitation = async () => {
    setGenerating(true);
    const { data, error } = await supabase
      .from("project_invitations")
      .insert({
        project_id: project.id,
        created_by: userId,
        role: inviteRole,
        max_uses: 100,
      })
      .select("*")
      .single();

    if (!error && data) {
      setInvitations((prev) => [data as ProjectInvitation, ...prev]);
    }
    setGenerating(false);
  };

  const deleteInvitation = async (id: string) => {
    await supabase.from("project_invitations").delete().eq("id", id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  const activeInvitations = invitations.filter(
    (i) => new Date(i.expires_at) > new Date() && i.use_count < i.max_uses
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Tous les projets
      </button>

      {/* Project header */}
      <div className="rounded-xl border border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                ROLE_COLORS[myRole]
              )}>
                {ROLE_LABELS[myRole]}
              </span>
              <span className="text-xs text-muted-foreground">
                {members.length} membre{members.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                Créé le {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {([["members", "Membres", Users], ["invitations", "Invitations", Link2]] as const).map(
          ([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
                tab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "invitations" && activeInvitations.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {activeInvitations.length}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Membres du projet</h3>
          </div>
          <div className="divide-y divide-border">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role];
              const profile = member.profile;
              const name = profile?.full_name || profile?.email || "Utilisateur";
              return (
                <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile?.email ?? ""}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    ROLE_COLORS[member.role]
                  )}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invitations tab */}
      {tab === "invitations" && (
        <div className="space-y-4">
          {/* Generate new link */}
          {isOwnerOrAdmin && (
            <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Générer un lien d'invitation</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1.5 block">Rôle attribué</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Membre</option>
                    <option value="viewer">Lecteur</option>
                  </select>
                </div>
                <div className="flex-shrink-0 mt-5">
                  <button
                    onClick={generateInvitation}
                    disabled={generating}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Générer
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le lien est valable 30 jours et peut être utilisé jusqu'à 100 fois.
              </p>
            </div>
          )}

          {/* List of invitations */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Liens d'invitation</h3>
              <span className="text-xs text-muted-foreground">{invitations.length} lien{invitations.length !== 1 ? "s" : ""}</span>
            </div>

            {invitations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center px-5">
                <Link2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun lien d'invitation</p>
                {isOwnerOrAdmin && (
                  <p className="text-xs text-muted-foreground">Génère un lien ci-dessus pour inviter des collaborateurs.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invitations.map((inv) => {
                  const expired = new Date(inv.expires_at) <= new Date() || inv.use_count >= inv.max_uses;
                  return (
                    <div key={inv.id} className={cn("px-5 py-4 space-y-3", expired && "opacity-50")}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          ROLE_COLORS[inv.role as ProjectMemberRole]
                        )}>
                          {ROLE_LABELS[inv.role as ProjectMemberRole]}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeUntil(inv.expires_at)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {inv.use_count}/{inv.max_uses} utilisations
                        </span>
                        {expired && (
                          <span className="text-xs text-destructive font-medium">Expirée</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 font-mono text-xs text-muted-foreground truncate">
                          {getJoinUrl(inv.token)}
                        </div>
                        <button
                          onClick={() => copyLink(inv)}
                          disabled={expired}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition"
                          title="Copier le lien"
                        >
                          {copiedId === inv.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => deleteInvitation(inv.id)}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition"
                            title="Révoquer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
