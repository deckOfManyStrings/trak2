import "server-only";

import { DEFAULT_OBJECTIVE_TITLES } from "@/app/dashboard/checklists/data";
import type { Objective } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads the objectives for an admin account, self-healing accounts that
 * signed up before objectives existed (e.g. the seeded demo account) by
 * inserting the 3 defaults - the same self-heal pattern
 * getSessionProfile() uses for a missing profile row. New admins never hit
 * this path since handle_new_user() (see 0008_checklists.sql) already
 * seeds them at signup.
 */
export async function getOrCreateObjectives(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<Objective[]> {
  const { data: existing } = await supabase
    .from("objectives")
    .select("*")
    .eq("owner_id", ownerId)
    .order("position", { ascending: true });

  if (existing && existing.length > 0) {
    return existing as Objective[];
  }

  const { data: created } = await supabase
    .from("objectives")
    .insert(
      DEFAULT_OBJECTIVE_TITLES.map((title, index) => ({
        owner_id: ownerId,
        title,
        position: index + 1,
      })),
    )
    .select("*");

  return ((created ?? []) as Objective[]).sort(
    (a, b) => a.position - b.position,
  );
}
