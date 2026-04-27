"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  ShieldAlert,
  Check,
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  Camera,
} from "lucide-react";
import { useRef } from "react";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const inputClass =
  "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition";

function SectionCard({
  icon,
  title,
  description,
  children,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        danger ? "border-destructive/30" : "border-border"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-5 py-4 border-b",
          danger ? "border-destructive/20 bg-destructive/5" : "border-border"
        )}
      >
        <div className={cn("mt-0.5", danger ? "text-destructive" : "text-primary")}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function FeedbackMsg({
  success,
  error,
}: {
  success?: string | null;
  error?: string | null;
}) {
  if (error)
    return (
      <p className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
        {error}
      </p>
    );
  if (success)
    return (
      <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
        <Check className="h-3 w-3" />
        {success}
      </p>
    );
  return null;
}

interface Props {
  profile: Profile | null;
  email: string;
}

export default function SettingsClient({ profile, email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok?: string; err?: string }>({});

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok?: string; err?: string }>({});

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok?: string; err?: string }>({});

  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Fichier invalide — image uniquement.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Image trop lourde — max 3 Mo.");
      return;
    }
    setAvatarUploading(true);
    setAvatarError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setAvatarError(uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) setAvatarError(updateError.message);
    else setAvatarUrl(urlWithBust);

    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const roleMeta = ROLE_META[profile?.role ?? "guest"];
  const initials = getInitials(profile?.full_name || email || "?");

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !fullName.trim()) return;
    setNameSaving(true);
    setNameMsg({});
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);
    setNameMsg(error ? { err: error.message } : { ok: "Nom mis à jour." });
    setNameSaving(false);
    if (!error) setTimeout(() => setNameMsg({}), 3000);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMsg({});
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailMsg(
      error
        ? { err: error.message }
        : { ok: "Email de confirmation envoyé — vérifie ta boîte." }
    );
    setEmailSaving(false);
    if (!error) setNewEmail("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      setPwdMsg({ err: "Minimum 6 caractères." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ err: "Les mots de passe ne correspondent pas." });
      return;
    }
    setPwdSaving(true);
    setPwdMsg({});
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdMsg(error ? { err: error.message } : { ok: "Mot de passe mis à jour." });
    setPwdSaving(false);
    if (!error) { setNewPwd(""); setConfirmPwd(""); }
    setTimeout(() => setPwdMsg({}), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "supprimer" || deleting) return;
    setDeleting(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Profile header card */}
      <div className="rounded-xl border border-border bg-card px-5 py-5 flex items-center gap-4">
        <div className="relative flex-shrink-0 group">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
            title="Changer la photo"
            disabled={avatarUploading}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={initials}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-primary select-none">{initials}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading
                ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                : <Camera className="h-5 w-5 text-white" />}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          {avatarError && (
            <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-40 text-center text-[10px] text-destructive bg-card border border-destructive/20 rounded-lg px-2 py-1 z-10">
              {avatarError}
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">
            {profile?.full_name || "—"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                roleMeta.className
              )}
            >
              {roleMeta.label}
            </span>
            {profile?.is_approved ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <Check className="h-3 w-3" />
                Approuvé
              </span>
            ) : (
              <span className="text-[11px] text-amber-400">En attente d'approbation</span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition flex-shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>

      {/* Full name */}
      <SectionCard
        icon={<User className="h-4 w-4" />}
        title="Nom complet"
        description="Ton nom affiché dans les conversations et le profil"
      >
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Prénom Nom"
            className={cn(inputClass, "flex-1")}
          />
          <button
            type="submit"
            disabled={nameSaving || !fullName.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            {nameSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {nameMsg.ok ? <Check className="h-3.5 w-3.5" /> : null}
            {nameMsg.ok ? "Sauvegardé !" : "Sauvegarder"}
          </button>
        </form>
        <FeedbackMsg error={nameMsg.err} />
      </SectionCard>

      {/* Email */}
      <SectionCard
        icon={<Mail className="h-4 w-4" />}
        title="Adresse email"
        description="Un lien de confirmation sera envoyé à la nouvelle adresse"
      >
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Actuel :</span>
          <span className="text-sm text-foreground font-medium">{email}</span>
        </div>
        <form onSubmit={handleChangeEmail} className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nouveau@email.com"
            required
            className={cn(inputClass, "flex-1")}
          />
          <button
            type="submit"
            disabled={emailSaving || !newEmail.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            {emailSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Modifier
          </button>
        </form>
        <FeedbackMsg success={emailMsg.ok} error={emailMsg.err} />
      </SectionCard>

      {/* Password */}
      <SectionCard
        icon={<Lock className="h-4 w-4" />}
        title="Mot de passe"
        description="Minimum 6 caractères"
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nouveau mot de passe"
              required
              minLength={6}
              className={cn(inputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input
            type={showPwd ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Confirmer le mot de passe"
            required
            className={inputClass}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwdSaving || !newPwd || !confirmPwd}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {pwdSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Changer le mot de passe
            </button>
          </div>
          <FeedbackMsg success={pwdMsg.ok} error={pwdMsg.err} />
        </form>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        icon={<ShieldAlert className="h-4 w-4" />}
        title="Zone de danger"
        description="Actions irréversibles — procède avec précaution"
        danger
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Supprimer le compte</p>
            <p className="text-xs text-muted-foreground mt-1">
              Toutes tes données seront supprimées définitivement. Cette action est irréversible.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Tape{" "}
              <span className="font-mono text-destructive font-semibold">supprimer</span>{" "}
              pour confirmer :
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="supprimer"
              className="w-full rounded-lg border border-destructive/30 bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition"
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteInput !== "supprimer" || deleting}
            className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Supprimer mon compte
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
