import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "@/components/projects/ProjectsClient";
import type { Project, ProjectMember } from "@/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = user
    ? await supabase
        .from("project_members")
        .select("role, project:projects(*)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
    : { data: [] };

  const projects = (memberships ?? []).map((m) => ({
    ...(m.project as unknown as Project),
    myRole: (m as unknown as ProjectMember).role,
  }));

  return <ProjectsClient projects={projects} userId={user?.id ?? ""} />;
}
