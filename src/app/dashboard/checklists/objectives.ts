import "server-only";

import type { Objective } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads the checklist objectives for one client, ordered by position.
 * New clients are seeded with the 3 defaults by the
 * clients_seed_objectives trigger (see 0017_per_client_objectives.sql).
 */
export async function getClientObjectives(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Objective[]> {
  const { data } = await supabase
    .from("objectives")
    .select("*")
    .eq("client_id", clientId)
    .order("position", { ascending: true });

  return (data ?? []) as Objective[];
}
