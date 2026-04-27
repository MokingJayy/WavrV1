import { createClient } from "@/lib/supabase/server";
import TimelineClient from "@/components/timeline/TimelineClient";
import type { TimelineEvent } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectTimelinePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("project_id", id)
    .order("date", { ascending: true });

  return (
    <TimelineClient
      projectId={id}
      initialEvents={(events ?? []) as TimelineEvent[]}
      currentUserId={user?.id ?? ""}
    />
  );
}
