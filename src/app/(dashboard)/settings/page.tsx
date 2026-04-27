import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/components/settings/SettingsClient";
import type { Profile } from "@/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <SettingsClient
      profile={profileData as Profile | null}
      email={user?.email ?? ""}
    />
  );
}
