import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/db";
import { cookies } from "next/headers";

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: Profile;
};

/**
 * Loads the currently authenticated user together with their profile row
 * (role, owner_id, status). Returns null when there is no session at all.
 *
 * If a valid session exists but its profile row is missing - e.g. the
 * account was created before the handle_new_user trigger existed - this
 * self-heals by creating a fresh admin profile for that user, rather than
 * leaving them stuck in a redirect loop between "/" and "/dashboard".
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return {
      userId: user.id,
      email: user.email ?? null,
      profile: profile as Profile,
    };
  }

  const { data: createdProfile } = await supabase
    .from("profiles")
    .insert({ id: user.id, email: user.email ?? "", role: "admin" })
    .select("*")
    .maybeSingle();

  if (!createdProfile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: createdProfile as Profile,
  };
}
