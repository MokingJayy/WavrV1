"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, CheckCircle2, X } from "lucide-react";

interface UploadedTrack {
  title: string;
  file_url: string;
  duration_seconds?: number;
}

interface VaultUploadProps {
  onUploaded?: (track: UploadedTrack) => void;
  projectId?: string | null;
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url); };
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    audio.src = url;
  });
}

export default function VaultUpload({ onUploaded, projectId }: VaultUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleFile = useCallback(
    async (file: File) => {
      const allowed = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/aiff", "audio/x-aiff", "audio/flac"];
      if (!allowed.includes(file.type) && !file.name.match(/\.(wav|mp3|aiff|flac|aif)$/i)) {
        setError("Format non supporté. Utilise WAV, MP3, AIFF ou FLAC.");
        return;
      }

      if (file.size > 500 * 1024 * 1024) {
        setError("Fichier trop lourd (max 500 MB).");
        return;
      }

      setUploading(true);
      setError(null);
      setSuccess(null);

      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      setProgress(`Upload de ${file.name}...`);

      const durationSeconds = await getAudioDuration(file);

      const { data, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(`Erreur upload : ${uploadError.message}`);
        setUploading(false);
        setProgress(null);
        return;
      }

      const { data: urlData } = supabase.storage.from("audio").getPublicUrl(data.path);
      const title = file.name.replace(/\.[^/.]+$/, "");

      setProgress("Enregistrement dans la base...");

      const { error: dbError } = await supabase.from("tracks").insert({
        title,
        version: "demo",
        file_url: urlData.publicUrl,
        project_id: projectId ?? null,
        duration_seconds: durationSeconds > 0 ? Math.round(durationSeconds) : null,
      });

      if (dbError) {
        setError(`Fichier uploadé mais erreur DB : ${dbError.message}`);
      } else {
        setSuccess(`"${title}" ajouté au Vault !`);
        onUploaded?.({ title, file_url: urlData.publicUrl, duration_seconds: durationSeconds > 0 ? Math.round(durationSeconds) : undefined });
      }

      setUploading(false);
      setProgress(null);
    },
    [supabase, onUploaded, projectId]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
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
          accept=".wav,.mp3,.aiff,.aif,.flac"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="mt-3 text-sm font-medium text-foreground">{progress}</p>
          </>
        ) : (
          <>
            <Upload className={`h-8 w-8 ${dragging ? "text-primary" : "text-muted-foreground/40"}`} />
            <p className="mt-3 text-sm font-medium text-foreground">
              {dragging ? "Relâche pour uploader" : "Glisse un fichier audio ici"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou <span className="text-primary underline">clique pour choisir</span> — WAV, AIFF, MP3, FLAC · max 500 MB
            </p>
          </>
        )}
      </label>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
          <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}
    </div>
  );
}
