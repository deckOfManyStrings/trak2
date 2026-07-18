import "server-only";

import type { ChecklistEntry, Objective } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ObjectiveStat = {
  objective_id: string;
  title: string;
  yes_count: number;
  no_count: number;
  tracked_days: number;
  rating_percent: number | null;
};

/**
 * The rolling 12-month window used to compute one Annual Assessment
 * Report's objective ratings: the year ending on (and including) the date
 * of the review meeting.
 */
export function annualReportPeriod(reviewDate: string): {
  periodStart: string;
  periodEnd: string;
} {
  const end = new Date(`${reviewDate}T00:00:00`);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1);

  const toDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

  return { periodStart: toDateString(start), periodEnd: reviewDate };
}

/**
 * Aggregates a client's checklist entries within [periodStart, periodEnd]
 * into a per-objective rating. Only Y/N marks count toward tracked_days -
 * Holiday/No-program/N-A days are excluded from the denominator entirely.
 * Objectives with zero tracked days for this client/period are dropped, so
 * the Annual Report only shows objectives that were actually worked on.
 */
export async function getTrackedObjectiveStats(
  supabase: SupabaseClient,
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ObjectiveStat[]> {
  const [{ data: objectives }, { data: entries }] = await Promise.all([
    supabase.from("objectives").select("*").eq("client_id", clientId),
    supabase
      .from("checklist_entries")
      .select("*")
      .eq("client_id", clientId)
      .gte("entry_date", periodStart)
      .lte("entry_date", periodEnd)
      .in("value", ["Y", "N"]),
  ]);

  const titleById = new Map(
    ((objectives ?? []) as Objective[]).map((objective) => [
      objective.id,
      objective.title,
    ]),
  );

  const countsByObjective = new Map<string, { yes: number; no: number }>();
  for (const entry of (entries ?? []) as ChecklistEntry[]) {
    const counts = countsByObjective.get(entry.objective_id) ?? {
      yes: 0,
      no: 0,
    };
    if (entry.value === "Y") counts.yes += 1;
    if (entry.value === "N") counts.no += 1;
    countsByObjective.set(entry.objective_id, counts);
  }

  const stats: ObjectiveStat[] = [];
  for (const [objectiveId, counts] of countsByObjective) {
    const trackedDays = counts.yes + counts.no;
    if (trackedDays === 0) continue;

    stats.push({
      objective_id: objectiveId,
      title: titleById.get(objectiveId) ?? "Untitled objective",
      yes_count: counts.yes,
      no_count: counts.no,
      tracked_days: trackedDays,
      rating_percent: Math.round((counts.yes / trackedDays) * 10000) / 100,
    });
  }

  return stats;
}
