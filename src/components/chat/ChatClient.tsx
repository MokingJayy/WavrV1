"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, Lock, Send, Plus, X } from "lucide-react";
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
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const newChannelInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;
  const isFirstMount = useRef(true);

  const activeChannel = channelsList.find((ch) => ch.id === activeChannelId);

  useEffect(() => {
    if (showNewChannel) newChannelInputRef.current?.focus();
  }, [showNewChannel]);

  const handleCreateChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || creatingChannel) return;
    setCreatingChannel(true);

    const { data, error } = await supabase
      .from("channels")
      .insert({ name, allowed_roles: ALL_ROLES })
      .select("*")
      .single();

    if (data && !error) {
      setChannelsList((prev) => [...prev, data as Channel]);
      setActiveChannelId((data as Channel).id);
      setMessages([]);
    }

    setNewChannelName("");
    setShowNewChannel(false);
    setCreatingChannel(false);
  };

  const handleNewChannelKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCreateChannel();
    if (e.key === "Escape") { setShowNewChannel(false); setNewChannelName(""); }
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
            onClick={() => setShowNewChannel((v) => !v)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition"
            title="Nouveau canal"
          >
            {showNewChannel ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </button>
        </div>
        {channelsList.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannelId(ch.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition",
              ch.id === activeChannelId
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {isPublicChannel(ch) ? (
              <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="flex-1 text-left truncate">{ch.name}</span>
          </button>
        ))}

        {showNewChannel && (
          <div className="mt-1 px-1">
            <input
              ref={newChannelInputRef}
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={handleNewChannelKey}
              placeholder="nom-du-canal"
              disabled={creatingChannel}
              className="w-full rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <p className="mt-1 px-1 text-[10px] text-muted-foreground">Entrée pour créer · Échap pour annuler</p>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {activeChannel ? (
            <>
              {isPublicChannel(activeChannel) ? (
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
              disabled={!activeChannelId}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || !activeChannelId}
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
