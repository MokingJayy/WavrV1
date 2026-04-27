"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  Loader2,
  CheckCircle2,
  X,
  Download,
  HardDrive,
  Trash2,
  FileCode2,
} from "lucide-react";

interface Session {
  id: string;
  title: string;
  daw: string;
  file_url: string;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

const DAW_CONFIG: Record<string, { label: string; color: string; exts: string[] }> = {
  "ableton":    { label: "Ableton Live", color: "bg-amber-500/10 text-amber-400 border-amber-500/20",    exts: [".als", ".alp"] },
  "fl-studio":  { label: "FL Studio",    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",  exts: [".flp"] },
  "logic-pro":  { label: "Logic Pro",    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",        exts: [".logicx", ".logic"] },
  "pro-tools":  { label: "Pro Tools",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", exts: [".ptx", ".ptxt", ".ptsession"] },
  "other":      { label: "Autre DAW",    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",        exts: [] },
};

const ALL_EXTS = [".als", ".alp", ".flp", ".logicx", ".logic", ".ptx", ".ptxt", ".ptsession"];

function detectDaw(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".als") || lower.endsWith(".alp")) return "ableton";
  if (lower.endsWith(".flp")) return "fl-studio";
  if (lower.endsWith(".logicx") || lower.endsWith(".logic")) return "logic-pro";
  if (lower.endsWith(".ptx") || lower.endsWith(".ptxt") || lower.endsWith(".ptsession")) return "pro-tools";
  return "other";
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filterDaw, setFilterDaw] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleFile = useCallback(async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALL_EXTS.includes(ext)) {
      setUploadError("Format non supporté. Accepté : .als, .flp, .logicx, .ptx, .ptxt…");
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setUploadError("Fichier trop lourd (max 2 GB).");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const daw = detectDaw(file.name);
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    setUploadProgress(`Upload de ${file.name}…`);

    const { data, error: storageError } = await supabase.storage
      .from("sessions")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (storageError) {
      setUploadError(`Erreur upload : ${storageError.message}`);
      setUploading(false);
      setUploadProgress(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("sessions").getPublicUrl(data.path);
    const title = file.name.replace(/\.[^/.]+$/, "");

    setUploadProgress("Enregistrement…");

    const { error: dbError } = await supabase.from("sessions").insert({
      title,
      daw,
      file_url: urlData.publicUrl,
      file_size: file.size,
    });

    if (dbError) {
      setUploadError(`Fichier uploadé mais erreur DB : ${dbError.message}`);
    } else {
      setUploadSuccess(`"${title}" ajouté !`);
      fetchSessions();
    }

    setUploading(false);
    setUploadProgress(null);
  }, [supabase, fetchSessions]);

  const deleteSession = async (session: Session) => {
    const path = session.file_url.split("/sessions/")[1];
    if (path) await supabase.storage.from("sessions").remove([path]);
    await supabase.from("sessions").delete().eq("id", session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    setConfirmDeleteId(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filteredSessions = filterDaw
    ? sessions.filter((s) => s.daw === filterDaw)
    : sessions;

  const dawCounts = Object.keys(DAW_CONFIG).reduce<Record<string, number>>((acc, key) => {
    acc[key] = sessions.filter((s) => s.daw === key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sessions DAW</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ableton · FL Studio · Logic Pro · Pro Tools
        </p>
      </div>

      {/* Filtres DAW */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterDaw(null)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition ${
            filterDaw === null
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          Toutes ({sessions.length})
        </button>
        {Object.entries(DAW_CONFIG).map(([key, cfg]) =>
          dawCounts[key] > 0 ? (
            <button
              key={key}
              onClick={() => setFilterDaw(filterDaw === key ? null : key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                filterDaw === key ? cfg.color : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {cfg.label} ({dawCounts[key]})
            </button>
          ) : null
        )}
      </div>

      {/* Upload zone */}
      <div>
        <label
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            dragging
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept={ALL_EXTS.join(",")}
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="mt-3 text-sm font-medium text-foreground">{uploadProgress}</p>
            </>
          ) : (
            <>
              <FileCode2 className={`h-8 w-8 ${dragging ? "text-primary" : "text-muted-foreground/40"}`} />
              <p className="mt-3 text-sm font-medium text-foreground">
                {dragging ? "Relâche pour uploader" : "Glisse ta session DAW ici"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou <span className="text-primary underline">clique pour choisir</span>
                {" — "}.als · .flp · .logicx · .ptx · max 2 GB
              </p>
            </>
          )}
        </label>

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}
        {uploadSuccess && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-400">{uploadSuccess}</p>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
          <div className="w-7 shrink-0" />
          <div className="flex-1 min-w-0">Session</div>
          <div className="w-32 shrink-0">DAW</div>
          <div className="w-20 shrink-0 text-right">Taille</div>
          <div className="w-28 shrink-0 text-right">Date</div>
          <div className="w-16 shrink-0" />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}

        {!loading && filteredSessions.length === 0 && (
          <div className="py-12 text-center">
            <HardDrive className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterDaw ? "Aucune session pour ce DAW." : "Aucune session pour l'instant."}
            </p>
          </div>
        )}

        {filteredSessions.map((session) => {
          const cfg = DAW_CONFIG[session.daw] ?? DAW_CONFIG.other;
          return (
            <div
              key={session.id}
              className="flex items-center gap-4 px-4 py-3 group border-b border-border last:border-0 hover:bg-accent/50 transition"
            >
              <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md bg-secondary">
                <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                {session.notes && (
                  <p className="text-xs text-muted-foreground truncate">{session.notes}</p>
                )}
              </div>
              <div className="w-32 shrink-0">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {formatSize(session.file_size)}
              </div>
              <div className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                {formatDate(session.created_at)}
              </div>
              <div className="w-16 shrink-0 flex items-center justify-end gap-1">
                {confirmDeleteId === session.id ? (
                  <>
                    <button
                      onClick={() => deleteSession(session)}
                      className="rounded px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      Non
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={session.file_url}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition opacity-0 group-hover:opacity-100"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
