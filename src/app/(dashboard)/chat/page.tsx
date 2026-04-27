import { createClient } from "@/lib/supabase/server";
import ChatClient from "@/components/chat/ChatClient";
import type { Channel, Message, Profile } from "@/types";

type ChatMessage = Message & { author?: Profile | null };

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  const profile = profileData as Profile | null;

  const { data: channelsData } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: true });

  const channels = (channelsData ?? []) as Channel[];

  const filteredChannels = profile
    ? channels.filter((ch) =>
        (ch.allowed_roles as string[]).includes(profile.role)
      )
    : channels;

  const firstChannel = filteredChannels[0] ?? null;

  let initialMessages: ChatMessage[] = [];
  if (firstChannel) {
    const { data } = await supabase
      .from("messages")
      .select(
        "*, author:profiles!author_id(id, full_name, avatar_url, role)"
      )
      .eq("channel_id", firstChannel.id)
      .order("created_at", { ascending: true })
      .limit(100);
    initialMessages = (data ?? []) as ChatMessage[];
  }

  return (
    <ChatClient
      channels={filteredChannels}
      initialMessages={initialMessages}
      initialChannelId={firstChannel?.id ?? null}
      currentUserId={user?.id ?? null}
      currentUserProfile={profile}
    />
  );
}
