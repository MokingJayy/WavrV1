import { createClient } from "@/lib/supabase/server";
import StageClient from "@/components/stage/StageClient";
import type { Track } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectStagePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: setlists }, { data: tracks }] = await Promise.all([
    supabase
      .from("stage_setlists")
      .select("*")
      .eq("project_id", id)
      .order("event_date", { ascending: true }),
    supabase
      .from("tracks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <StageClient
      projectId={id}
      initialSetlists={(setlists ?? []) as Parameters<typeof StageClient>[0]["initialSetlists"]}
      tracks={(tracks ?? []) as Track[]}
      currentUserId={user?.id ?? ""}
    />
  );
}
