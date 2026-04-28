"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Shield,
  Check,
  X,
  Loader2,
  User,
  Mail,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types";

const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  artist: {
    label: "Artiste",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  engineer: {
    label: "Ingé son",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  manager: {
    label: "Manager",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  admin: {
    label: "Admin",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  guest: {
    label: "Invité",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function AdminClient() {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchProfiles();
    }
  }, [currentUser, fetchProfiles]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.push("/projects");
      return;
    }

    setCurrentUser(profile);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  const toggleApproval = async (profileId: string, currentStatus: boolean) => {
    setUpdatingId(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: !currentStatus })
      .eq("id", profileId);

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === profileId ? { ...p, is_approved: !currentStatus } : p
      ));
    }
    setUpdatingId(null);
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground">Gérer les approbations utilisateurs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par email ou nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="px-3 py-2.5 rounded-lg border border-border bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          >
            <option value="all">Tous les rôles</option>
            <option value="artist">Artistes</option>
            <option value="engineer">Ingés son</option>
            <option value="manager">Managers</option>
            <option value="admin">Admins</option>
            <option value="guest">Invités</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
          <p className="text-xs text-muted-foreground">Total utilisateurs</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <p className="text-2xl font-bold text-emerald-400">{profiles.filter(p => p.is_approved).length}</p>
          <p className="text-xs text-muted-foreground">Approuvés</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <p className="text-2xl font-bold text-amber-400">{profiles.filter(p => !p.is_approved).length}</p>
          <p className="text-xs text-muted-foreground">En attente</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <p className="text-2xl font-bold text-orange-400">{profiles.filter(p => p.role === "admin").length}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProfiles.map((profile) => {
                  const roleMeta = ROLE_META[profile.role];
                  return (
                    <tr key={profile.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {profile.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {profile.full_name || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {profile.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            roleMeta.className
                          )}
                        >
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {profile.is_approved ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                            Approuvé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <X className="h-3.5 w-3.5" />
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleApproval(profile.id, profile.is_approved)}
                          disabled={updatingId === profile.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                            profile.is_approved
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {updatingId === profile.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : profile.is_approved ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              Révoquer
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Approuver
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
