"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, Lock, Send, Plus, X, Globe, Loader2, Megaphone, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Channel, Message, Profile } from "@/types";

type ChatMessage = Message & { author?: Profile | null };

interface Props {
  channels: Channel[];
  initialMessages: ChatMessage[];
  initialChannelId: string | null;
  currentUserId: string | null;
  currentUserProfile: Profile | null;
}

const ALL_ROLES = ["artist", "engineer", "manager", "admin", "guest"];

function isPublicChannel(ch: Channel): boolean {
  return ALL_ROLES.every((r) => (ch.allowed_roles as string[]).includes(r));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatClient({
  channels,
  initialMessages,
  initialChannelId,
  currentUserId,
  currentUserProfile,
}: Props) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannelId
  );
  const [channelsList, setChannelsList] = useState<Channel[]>(channels);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelType, setChannelType] = useState<"public" | "private" | "announcement">("public");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([...ALL_ROLES]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;
  const isFirstMount = useRef(true);

  const activeChannel = channelsList.find((ch) => ch.id === activeChannelId);

  const ROLES_META = [
    { value: "artist",   label: "Artiste" },
    { value: "engineer", label: "Ingé son" },
    { value: "manager",  label: "Manager" },
    { value: "admin",    label: "Admin" },
    { value: "guest",    label: "Invité" },
  ];

  const openModal = () => {
    setChannelType("public");
    setNewChannelName("");
    setNewChannelDesc("");
    setSelectedRoles([...ALL_ROLES]);
    setChannelError(null);
    setShowCreateModal(true);
  };

  const closeModal = () => { setShowCreateModal(false); setChannelError(null); };

  const handleDeleteChannel = async () => {
    if (!deleteChannelId || deletingChannel) return;
    setDeletingChannel(true);
    await supabase.from("channels").delete().eq("id", deleteChannelId);
    setChannelsList((prev) => prev.filter((ch) => ch.id !== deleteChannelId));
    if (activeChannelId === deleteChannelId) {
      const remaining = channelsList.filter((ch) => ch.id !== deleteChannelId);
      setActiveChannelId(remaining[0]?.id ?? null);
      setMessages([]);
    }
    setDeleteChannelId(null);
    setDeletingChannel(false);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreateChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || creatingChannel) return;
    setChannelError(null);

    const roles = channelType === "private" ? selectedRoles : ALL_ROLES;
    if (channelType === "private" && roles.length === 0) {
      setChannelError("Sélectionne au moins un rôle.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setChannelError("Non connecté — reconnecte-toi."); return; }

    setCreatingChannel(true);
    const { data, error } = await supabase
      .from("channels")
      .insert({
        name,
        description: newChannelDesc.trim() || null,
        allowed_roles: roles,
        type: channelType === "announcement" ? "announcement" : "text",
      })
      .select("*")
      .single();

    if (error) {
      setChannelError(error.code === "23505" ? `"#${name}" existe déjà.` : `[${error.code}] ${error.message}`);
      setCreatingChannel(false);
      return;
    }
    if (data) {
      setChannelsList((prev) => [...prev, data as Channel]);
      setActiveChannelId((data as Channel).id);
      setMessages([]);
      closeModal();
    }
    setCreatingChannel(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!activeChannelId) return;

    supabase
      .from("messages")
      .select("*, author:profiles!author_id(id, full_name, avatar_url, role)")
      .eq("channel_id", activeChannelId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages((data ?? []) as ChatMessage[]));
  }, [activeChannelId, supabase]);

  useEffect(() => {
    if (!activeChannelId) return;

    const sub = supabase
      .channel(`chat:${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select(
              "*, author:profiles!author_id(id, full_name, avatar_url, role)"
            )
            .eq("id", (payload.new as { id: string }).id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === (data as ChatMessage).id))
                return prev;
              return [...prev, data as ChatMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [activeChannelId, supabase]);

  const handleSend = async () => {
    if (!input.trim() || !activeChannelId || !currentUserId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        channel_id: activeChannelId,
        content,
        author_id: currentUserId,
        created_at: new Date().toISOString(),
        author: currentUserProfile,
      },
    ]);

    const { data } = await supabase
      .from("messages")
      .insert({ channel_id: activeChannelId, content, author_id: currentUserId })
      .select("*, author:profiles!author_id(id, full_name, avatar_url, role)")
      .single();

    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as ChatMessage) : m))
      );
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Channels sidebar */}
      <div className="w-48 flex-shrink-0 rounded-xl border border-border bg-card p-3 space-y-1">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Canaux
          </p>
          <button
            onClick={openModal}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition"
            title="Nouveau canal"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {channelsList.map((ch) => (
          <div
            key={ch.id}
            className={cn(
              "group flex w-full items-center gap-1 rounded-lg transition",
              ch.id === activeChannelId ? "bg-primary/10" : "hover:bg-accent"
            )}
          >
            <button
              onClick={() => setActiveChannelId(ch.id)}
              className={cn(
                "flex flex-1 min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                ch.id === activeChannelId ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {ch.type === "announcement" ? (
                <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
              ) : isPublicChannel(ch) ? (
                <Hash className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="flex-1 text-left truncate">{ch.name}</span>
            </button>
            {currentUserProfile?.role === "admin" && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteChannelId(ch.id); }}
                className="mr-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition"
                title="Supprimer le canal"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Delete channel confirm modal */}
        {deleteChannelId && (() => {
          const ch = channelsList.find((c) => c.id === deleteChannelId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteChannelId(null); }}>
              <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-foreground">Supprimer le canal</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Supprimer <span className="font-mono font-semibold text-foreground">#{ch?.name}</span> ? Tous les messages seront perdus.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteChannelId(null)}
                      className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteChannel}
                      disabled={deletingChannel}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition"
                    >
                      {deletingChannel && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create channel modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Créer un canal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure ton nouveau canal de discussion</p>
                </div>
                <button onClick={closeModal} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Channel type */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Type de canal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "public",       icon: Globe,     label: "Canal public",   desc: "Accessible à tous" },
                      { value: "announcement", icon: Megaphone, label: "Annonces",       desc: "Lecture seule (admins écrivent)" },
                      { value: "private",      icon: Lock,      label: "Canal privé",   desc: "Accès par rôle" },
                    ] as const).map(({ value, icon: Icon, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setChannelType(value);
                          if (value === "public") setSelectedRoles([...ALL_ROLES]);
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          channelType === value
                            ? "border-primary/50 bg-primary/10 ring-2 ring-primary/30"
                            : "border-border bg-secondary/50 hover:bg-accent"
                        )}
                      >
                        <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg", channelType === value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className={cn("text-[11px] font-semibold", channelType === value ? "text-primary" : "text-foreground")}>{label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nom du canal <span className="text-destructive">*</span></label>
                  <div className="flex items-center rounded-lg border border-border bg-secondary overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                    <span className="px-3 text-muted-foreground">
                      {channelType === "public" ? <Hash className="h-3.5 w-3.5" /> : channelType === "announcement" ? <Megaphone className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </span>
                    <input
                      autoFocus
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, ""))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") closeModal(); }}
                      placeholder="mon-canal"
                      className="flex-1 bg-transparent py-2 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Minuscules, tirets et chiffres uniquement</p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                  <input
                    type="text"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="À quoi sert ce canal ?"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>

                {channelType === "announcement" && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                    <Megaphone className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-400/80 leading-relaxed">
                      Seuls les <strong className="text-amber-400">admins</strong> peuvent envoyer des messages dans ce canal. Les autres membres peuvent uniquement lire.
                    </p>
                  </div>
                )}

                {/* Roles (private only) */}
                {channelType === "private" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Rôles autorisés</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES_META.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleRole(value)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                            selectedRoles.includes(value)
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {selectedRoles.includes(value) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {channelError && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{channelError}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition">
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateChannel}
                    disabled={creatingChannel || !newChannelName.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {creatingChannel && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Créer le canal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {activeChannel ? (
            <>
              {activeChannel.type === "announcement" ? (
                <Megaphone className="h-4 w-4 text-amber-400" />
              ) : isPublicChannel(activeChannel) ? (
                <Hash className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {activeChannel.name}
              </span>
              {activeChannel.description && (
                <span className="text-xs text-muted-foreground ml-2">
                  — {activeChannel.description}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Sélectionner un canal
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">
              Aucun message. Lancez la conversation !
            </p>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.author_id === currentUserId;
              const authorName = msg.author?.full_name || "Utilisateur";
              const prev = messages[i - 1];
              const showHeader =
                !prev ||
                prev.author_id !== msg.author_id ||
                new Date(msg.created_at).getTime() -
                  new Date(prev.created_at).getTime() >
                  5 * 60 * 1000;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row",
                    showHeader ? "mt-4" : "mt-0.5"
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border",
                      isOwn
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-secondary text-muted-foreground border-border",
                      !showHeader && "invisible"
                    )}
                  >
                    {getInitials(authorName)}
                  </div>

                  <div
                    className={cn(
                      "flex flex-col max-w-[70%]",
                      isOwn && "items-end"
                    )}
                  >
                    {showHeader && (
                      <span
                        className={cn(
                          "text-[11px] font-medium mb-1 px-1",
                          isOwn ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {isOwn ? "Vous" : authorName}
                        <span className="ml-2 font-normal opacity-60">
                          {formatTime(msg.created_at)}
                        </span>
                      </span>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Announcement banner */}
        {activeChannel?.type === "announcement" && currentUserProfile?.role !== "admin" && (
          <div className="flex items-center gap-2 border-t border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <Megaphone className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400/80">Canal d'annonces — seuls les <strong className="text-amber-400">admins</strong> peuvent écrire ici.</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeChannel
                  ? `Message dans #${activeChannel.name}…`
                  : "Sélectionner un canal"
              }
              disabled={!activeChannelId || (activeChannel?.type === "announcement" && currentUserProfile?.role !== "admin")}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || !activeChannelId || (activeChannel?.type === "announcement" && currentUserProfile?.role !== "admin")}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
