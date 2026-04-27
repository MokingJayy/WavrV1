"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Music, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "artist", label: "Artiste", description: "Chanteur, rappeur, instrumentiste…" },
  { value: "engineer", label: "Ingé son", description: "Mixage, mastering, prise de son" },
  { value: "manager", label: "Manager", description: "Booking, administration, label" },
  { value: "guest", label: "Invité", description: "Accès lecture seule" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("artist");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const resetState = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError(null);
    setEmailSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Le nom complet est requis."); return; }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), role },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mx-auto">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Vérifie ton email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Un lien de confirmation a été envoyé à{" "}
              <span className="text-foreground font-medium">{email}</span>.
              <br />Clique dessus pour activer ton compte.
            </p>
          </div>
          <button
            onClick={() => resetState("login")}
            className="text-sm text-primary hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-7">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wavr</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Wavr Studio — Accès réservé" : "Rejoins Wavr Studio"}
            </p>
          </div>
        </div>

        <div className="flex rounded-lg border border-border bg-secondary p-1">
          <button
            onClick={() => resetState("login")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition",
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Se connecter
          </button>
          <button
            onClick={() => resetState("signup")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition",
              mode === "signup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Créer un compte
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@example.com"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullname" className="text-sm font-medium text-foreground">Nom complet</label>
              <input
                id="fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Prénom Nom"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@example.com"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                Mot de passe <span className="text-muted-foreground font-normal">(min. 6 caractères)</span>
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ton rôle</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition",
                      role === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="text-[10px] leading-tight opacity-70">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
