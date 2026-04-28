"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  CheckCircle2,
  X,
  Download,
  HardDrive,
  Trash2,
  FileCode2,
  FolderPlus,
  Folder,
  ArrowLeft,
} from "lucide-react";

interface Session {
  id: string;
  title: string;
  is_folder: boolean;
  folder_id: string | null;
  daw: string | null;
  file_url: string | null;
  file_size: number | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const DAW_CONFIG: Record<string, { label: string; color: string; exts: string[] }> = {
  "ableton":    { label: "Ableton Live", color: "bg-amber-500/10 text-amber-400 border-amber-500/20",    exts: [".als", ".alp"] },
  "fl-studio":  { label: "FL Studio",    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",  exts: [".flp"] },
  "logic-pro":  { label: "Logic Pro",    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",        exts: [".logicx", ".logic"] },
  "pro-tools":  { label: "Pro Tools",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", exts: [".ptx", ".ptxt", ".ptsession"] },
  "other":      { label: "Autre DAW",    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",        exts: [] },
};

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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
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

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const { error } = await supabase.from("sessions").insert({
      title: newFolderName.trim(),
      is_folder: true,
      folder_id: currentFolderId,
    });
    if (error) {
      setUploadError(`Erreur création dossier : ${error.message}`);
    } else {
      setNewFolderName("");
      setCreatingFolder(false);
      fetchSessions();
    }
    setCreatingFolder(false);
  };

  const handleFolder = async (folderName: string, files: FileList) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(`Création du dossier "${folderName}"…`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError("Non connecté");
      setUploading(false);
      setUploadProgress(null);
      return;
    }

    const { data: folderData, error: folderError } = await supabase.from("sessions").insert({
      title: folderName,
      is_folder: true,
      folder_id: currentFolderId,
      uploaded_by: user.id,
    }).select().single();

    if (folderError) {
      setUploadError(`Erreur création dossier : ${folderError.message}`);
      setUploading(false);
      setUploadProgress(null);
      return;
    }

    const folderId = folderData.id;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        errorCount++;
        continue;
      }

      setUploadProgress(`Upload ${i + 1}/${files.length}: ${file.name}…`);

      const daw = detectDaw(file.name);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

      const { data, error: storageError } = await supabase.storage
        .from("sessions")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (storageError) {
        errorCount++;
        continue;
      }

      const { data: urlData } = supabase.storage.from("sessions").getPublicUrl(data.path);
      const title = file.name.replace(/\.[^/.]+$/, "");

      const { error: dbError } = await supabase.from("sessions").insert({
        title,
        is_folder: false,
        folder_id: folderId,
        daw,
        file_url: urlData.publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
      });

      if (dbError) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      setUploadError(`${successCount} fichiers uploadés, ${errorCount} erreurs.`);
    } else {
      setUploadSuccess(`Dossier "${folderName}" créé avec ${successCount} fichiers !`);
    }

    fetchSessions();
    setUploading(false);
    setUploadProgress(null);
  };

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Fichier trop lourd (max 5 MB sur le plan gratuit Supabase).");
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
      is_folder: false,
      folder_id: currentFolderId,
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
  }, [supabase, fetchSessions, currentFolderId]);

  const deleteSession = async (session: Session) => {
    if (session.is_folder) {
      // Delete all files in the folder from storage
      const folderFiles = sessions.filter(s => s.folder_id === session.id && s.file_url);
      
      for (const file of folderFiles) {
        const path = file.file_url?.split("/sessions/")[1];
        if (path) await supabase.storage.from("sessions").remove([path]);
      }
    } else {
      // Delete single file from storage
      const path = session.file_url?.split("/sessions/")[1];
      if (path) await supabase.storage.from("sessions").remove([path]);
    }
    
    // Delete from database (cascade will handle folder contents)
    await supabase.from("sessions").delete().eq("id", session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    setConfirmDeleteId(null);
    fetchSessions();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    
    if (files.length === 0) return;

    // Check if it's a folder (multiple files with same parent)
    if (files.length > 1) {
      const folderName = files[0].webkitRelativePath?.split("/")[0] || "Dossier uploadé";
      handleFolder(folderName, files);
    } else {
      const file = files[0];
      handleFile(file);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const inCurrentFolder = s.folder_id === currentFolderId;
    const matchesDaw = !filterDaw || s.daw === filterDaw;
    return inCurrentFolder && matchesDaw;
  });

  const dawCounts = Object.keys(DAW_CONFIG).reduce<Record<string, number>>((acc, key) => {
    acc[key] = sessions.filter((s) => s.daw === key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sessions DAW</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ableton · FL Studio · Logic Pro · Pro Tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          )}
          <button
            onClick={() => setCreatingFolder(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </button>
        </div>
      </div>

      {creatingFolder && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nom du dossier..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            onClick={createFolder}
            disabled={!newFolderName.trim() || creatingFolder}
            className="rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Créer
          </button>
          <button
            onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            Annuler
          </button>
        </div>
      )}

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
            webkitdirectory=""
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                if (files.length > 1) {
                  const folderName = files[0].webkitRelativePath?.split("/")[0] || "Dossier uploadé";
                  handleFolder(folderName, files);
                } else {
                  const f = files[0];
                  handleFile(f);
                }
              }
              e.target.value = "";
            }}
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
                {dragging ? "Relâche pour uploader" : "Glisse tes sessions ou un dossier ici"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou <span className="text-primary underline">clique pour choisir</span>
                {" — "}Tous les formats acceptés · max 5 MB
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
          if (session.is_folder) {
            return (
              <div
                key={session.id}
                onClick={() => setCurrentFolderId(session.id)}
                className="flex items-center gap-4 px-4 py-3 group border-b border-border last:border-0 hover:bg-accent/50 transition cursor-pointer"
              >
                <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md bg-secondary">
                  <Folder className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                </div>
                <div className="w-32 shrink-0">
                  <span className="rounded-md border px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                    Dossier
                  </span>
                </div>
                <div className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  —
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
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmDeleteId(session.id); 
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          const cfg = DAW_CONFIG[session.daw ?? "other"] ?? DAW_CONFIG.other;
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
                      href={session.file_url ?? "#"}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
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
