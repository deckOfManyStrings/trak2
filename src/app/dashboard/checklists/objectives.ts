import "server-only";

import type { Objective, ObjectiveWithEntryCount } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads active checklist objectives for one client, ordered by position.
 * Used by the daily grid, day view, and month export.
 */
export async function getClientObjectives(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Objective[]> {
  const { data } = await supabase
    .from("objectives")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("position", { ascending: true });

  return (data ?? []) as Objective[];
}

/**
 * Loads every objective for a client (active + retired) with daily mark
 * counts, for the manage-objectives panel.
 */
export async function getManagedClientObjectives(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ObjectiveWithEntryCount[]> {
  const [{ data: objectives }, { data: entries }] = await Promise.all([
    supabase
      .from("objectives")
      .select("*")
      .eq("client_id", clientId)
      .order("position", { ascending: true }),
    supabase
      .from("checklist_entries")
      .select("objective_id")
      .eq("client_id", clientId),
  ]);

  const countByObjective = new Map<string, number>();
  for (const entry of entries ?? []) {
    const id = entry.objective_id as string;
    countByObjective.set(id, (countByObjective.get(id) ?? 0) + 1);
  }

  return ((objectives ?? []) as Objective[]).map((objective) => ({
    ...objective,
    entry_count: countByObjective.get(objective.id) ?? 0,
  }));
}
