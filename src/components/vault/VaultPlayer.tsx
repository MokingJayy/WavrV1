"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";

interface Track {
  id: string;
  title: string;
  version: string;
  file_url: string;
}

interface VaultPlayerProps {
  track: Track;
  onClose: () => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const versionColors: Record<string, string> = {
  mixup: "text-violet-400",
  untitled: "text-zinc-400",
  final: "text-emerald-400",
  master: "text-amber-400",
};

export default function VaultPlayer({ track, onClose }: VaultPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.play();
    setPlaying(true);
    return () => { audio.pause(); };
  }, [track.id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime ?? 0);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration ?? 0);
  };

  const onEnded = () => setPlaying(false);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    setMuted(next);
    audioRef.current.muted = next;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-60 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-3">
      <audio
        ref={audioRef}
        src={track.file_url}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 w-52 flex-shrink-0">
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition flex-shrink-0"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
            <p className={`text-xs capitalize ${versionColors[track.version] ?? "text-muted-foreground"}`}>
              {track.version}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={seek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 w-32 flex-shrink-0">
          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition">
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <div className="relative flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary"
              style={{ width: `${muted ? 0 : volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={changeVolume}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
