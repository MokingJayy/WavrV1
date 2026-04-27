import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectDetailClient from "@/components/projects/ProjectDetailClient";
import type { Project, ProjectMember, ProjectInvitation } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectManagePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: rawMembers } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", id)
    .order("joined_at", { ascending: true });

  const userIds = (rawMembers ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, email")
        .in("id", userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const membersData = (rawMembers ?? []).map((m) => ({
    ...m,
    profile: profileMap[m.user_id] ?? null,
  }));

  const { data: invitations } = await supabase
    .from("project_invitations")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const myMembership = (membersData ?? []).find((m) => m.user_id === user?.id);

  return (
    <ProjectDetailClient
      project={project as Project}
      members={(membersData ?? []) as unknown as ProjectMember[]}
      invitations={(invitations ?? []) as ProjectInvitation[]}
      myRole={myMembership?.role ?? "viewer"}
      userId={user?.id ?? ""}
    />
  );
}
