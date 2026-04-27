import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileData } = user
    ? await supabase.from("profiles").select("full_name, role, avatar_url").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profileData as Pick<Profile, "full_name" | "role" | "avatar_url"> | null}
          email={user?.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
