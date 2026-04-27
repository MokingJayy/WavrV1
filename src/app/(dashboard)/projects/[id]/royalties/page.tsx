import { createClient } from "@/lib/supabase/server";
import RoyaltiesClient from "@/components/royalties/RoyaltiesClient";
import type { Track, RoyaltySplit, Profile } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectRoyaltiesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch tracks
  const { data: tracks } = await supabase
    .from("tracks")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // 2. Fetch project members (profiles)
  const { data: rawMembers } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", id);

  const userIds = (rawMembers ?? []).map(m => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", userIds)
    : { data: [] };

  // 3. Fetch splits for all project tracks
  const trackIds = (tracks ?? []).map(t => t.id);
  const { data: splits } = trackIds.length
    ? await supabase
        .from("royalty_splits")
        .select("*, profile:profiles(id, full_name, avatar_url, role)")
        .in("track_id", trackIds)
    : { data: [] };

  return (
    <RoyaltiesClient
      projectId={id}
      tracks={(tracks ?? []) as Track[]}
      members={(profiles ?? []).map(p => ({ profile: p as Profile }))}
      initialSplits={(splits ?? []) as RoyaltySplit[]}
    />
  );
}
